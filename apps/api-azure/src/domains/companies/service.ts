import { z } from "zod";
import { DomainError } from "../../shared/errors.js";
import { sha256, stableId } from "../../shared/ids.js";
import { permissionsFor, readPermission, writePermission } from "../../shared/permissions.js";
import type { Actor, AuditEntry, MembershipData, Page, Resource } from "../../shared/types.js";
import type { BusinessStore } from "../../store/types.js";

export const profileKinds = [
  "company",
  "capability",
  "experience",
  "evidence",
  "financial",
  "coverage",
  "rule",
  "membership",
  "team",
  "sourcepolicy",
  "job",
] as const;

const money = z.string().regex(/^[0-9]{1,24}(\.[0-9]{1,4})?$/);
const country = z.string().regex(/^[A-Z]{2}$/);
const currency = z.string().regex(/^[A-Z]{3}$/);

export class CompanyService {
  constructor(private readonly store: BusinessStore) {}

  async authorize(actor: Actor, companyId: string, permission: string): Promise<MembershipData> {
    const memberships = await this.store.memberships(actor);
    const membership = memberships.find((item) => item.companyId === companyId);
    if (!membership) throw new DomainError(403, "company_access_denied");
    const data = membership.data as unknown as MembershipData;
    if (!permissionsFor(data.roles, data.active).includes(permission)) throw new DomainError(403, "permission_denied");
    return data;
  }

  async get(actor: Actor, companyId: string, kind: string, id: string): Promise<Resource> {
    this.checkKind(kind);
    await this.authorize(actor, companyId, readPermission(kind));
    return (await this.store.get(companyId, kind, id)) ?? Promise.reject(new DomainError(404, "resource_not_found"));
  }

  async list(actor: Actor, companyId: string, kind: string, offset: number, limit: number): Promise<Page<Resource>> {
    this.checkKind(kind);
    if (offset < 0 || offset > 10000 || limit < 1 || limit > 100) throw new DomainError(400, "invalid_pagination");
    await this.authorize(actor, companyId, readPermission(kind));
    const rows = await this.store.list(companyId, kind, offset, limit + 1);
    return { items: rows.slice(0, limit), offset, limit, hasMore: rows.length > limit };
  }

  async createCompany(actor: Actor, input: { legalName: string; countryCode: string; taxId: string }, commandId: string, correlation: string): Promise<Resource> {
    const data = z.object({ legalName: z.string().trim().min(1).max(200), countryCode: country, taxId: z.string().trim().min(1).max(50) }).parse(input);
    const id = stableId(`company:${data.countryCode}:${data.taxId.trim().toUpperCase()}`);
    const fingerprint = sha256(actor.key + JSON.stringify(data));
    const replay = await this.replay(id, commandId, fingerprint);
    if (replay) return replay;
    if (await this.store.get(id, "company", id)) throw new DomainError(409, "company_already_registered");
    const company: Resource = { id, companyId: id, kind: "company", version: 1, data };
    const member: Resource = {
      id: stableId(`member:${id}:${actor.key}`),
      companyId: id,
      kind: "membership",
      version: 1,
      data: { tenantId: actor.tenantId, objectId: actor.objectId, roles: ["Administrator"], active: true },
    };
    await this.commit(actor, company, null, commandId, fingerprint, correlation, [{ value: member, expectedVersion: null }]);
    return company;
  }

  async save(
    actor: Actor,
    companyId: string,
    kind: string,
    id: string | null,
    input: Record<string, unknown>,
    etag: string | null,
    commandId: string,
    correlation: string,
  ): Promise<Resource> {
    this.checkKind(kind);
    if (kind === "job" || (kind === "company" && !id)) throw new DomainError(405, "operation_not_supported");
    await this.authorize(actor, companyId, writePermission(kind));
    const fingerprint = sha256(`${actor.key}:${kind}:${id}:${etag}:${JSON.stringify(input)}`);
    const replay = await this.replay(companyId, commandId, fingerprint);
    if (replay) return replay;
    let previous: Resource | null = null;
    if (id) {
      previous = await this.store.get(companyId, kind, id);
      if (!previous) throw new DomainError(404, "resource_not_found");
      if (!etag) throw new DomainError(428, "if_match_required");
      if (etag !== `"${previous.version}"`) throw new DomainError(412, "version_conflict");
    }
    const data = await this.validate(actor, companyId, kind, input, previous);
    let resourceId = id ?? stableId(`resource:${companyId}:${kind}:${commandId}`);
    if (kind === "membership" && !id) {
      const member = data as unknown as MembershipData;
      resourceId = stableId(`member:${companyId}:${member.tenantId}:${member.objectId}`);
    }
    const result: Resource = { id: resourceId, companyId, kind, version: (previous?.version ?? 0) + 1, data };
    await this.commit(actor, result, previous, commandId, fingerprint, correlation, []);
    return result;
  }

  async transition(actor: Actor, companyId: string, kind: string, id: string, etag: string | null, commandId: string, correlation: string): Promise<Resource> {
    if (kind !== "financial" && kind !== "rule") throw new DomainError(405, "operation_not_supported");
    await this.authorize(actor, companyId, kind === "financial" ? "financial.approve" : "rules.publish");
    const fingerprint = sha256(`${actor.key}:approve:${kind}:${id}:${etag}`);
    const replay = await this.replay(companyId, commandId, fingerprint);
    if (replay) return replay;
    const previous = await this.store.get(companyId, kind, id);
    if (!previous) throw new DomainError(404, "resource_not_found");
    if (!etag) throw new DomainError(428, "if_match_required");
    if (etag !== `"${previous.version}"`) throw new DomainError(412, "version_conflict");
    let data: Record<string, unknown>;
    if (kind === "financial") {
      const financial = previous.data as { status: string; createdBy?: string };
      if (financial.status !== "Draft") throw new DomainError(409, "immutable_approved_version");
      if (financial.createdBy === actor.key) throw new DomainError(403, "separate_approver_required");
      data = { ...previous.data, status: "Approved", approvedBy: actor.key };
    } else {
      const rule = previous.data as { status: string };
      if (rule.status !== "Draft") throw new DomainError(409, "immutable_published_version");
      data = { ...previous.data, status: "Published" };
    }
    const result = { ...previous, version: previous.version + 1, data };
    await this.commit(actor, result, previous, commandId, fingerprint, correlation, []);
    return result;
  }

  async eligibleFinancial(actor: Actor, companyId: string): Promise<Resource[]> {
    await this.authorize(actor, companyId, "financial.read");
    const snapshots: Resource[] = [];
    for (let offset = 0; ; offset += 100) {
      if (offset > 10000) throw new DomainError(413, "financial_history_limit");
      const batch = await this.store.list(companyId, "financial", offset, 100);
      snapshots.push(...batch);
      if (batch.length < 100) break;
    }
    const today = new Date().toISOString().slice(0, 10);
    return snapshots.filter((row) => {
      const data = row.data as { status?: string; validUntil?: string };
      return data.status === "Approved" && (data.validUntil ?? "") >= today;
    });
  }

  private async validate(actor: Actor, companyId: string, kind: string, input: Record<string, unknown>, previous: Resource | null): Promise<Record<string, unknown>> {
    switch (kind) {
      case "company": {
        const company = z.object({ legalName: z.string().min(1).max(200), countryCode: country, taxId: z.string().min(1).max(50) }).parse(input);
        const old = previous?.data as { countryCode: string; taxId: string };
        if (company.countryCode !== old.countryCode || company.taxId !== old.taxId) throw new DomainError(400, "immutable_company_identity");
        return company;
      }
      case "capability":
        return z.object({
          name: z.string().min(1).max(150),
          description: z.string().min(1).max(2000),
          countryCode: country,
          validUntil: z.string().min(8),
          active: z.boolean(),
        }).parse(input);
      case "experience":
        return z.object({
          client: z.string().min(1).max(200),
          subject: z.string().min(1).max(2000),
          start: z.string(),
          end: z.string(),
          amount: money,
          currency,
          status: z.literal("PendingEvidence").optional().default("PendingEvidence"),
        }).parse(input);
      case "evidence": {
        const evidence = z.object({
          experienceId: z.string().uuid(),
          fileName: z.string().min(1).max(200),
          sha256: z.string().regex(/^[A-Fa-f0-9]{64}$/),
          locator: z.string().min(1).max(500),
          status: z.literal("PendingUpload").optional().default("PendingUpload"),
        }).parse(input);
        if (!(await this.store.get(companyId, "experience", evidence.experienceId))) throw new DomainError(400, "invalid_company_reference");
        return evidence;
      }
      case "financial": {
        if (previous && (previous.data as { status?: string }).status !== "Draft") throw new DomainError(409, "immutable_approved_version");
        const financial = z.object({
          periodStart: z.string(),
          periodEnd: z.string(),
          validUntil: z.string(),
          currency,
          assets: money,
          liabilities: money,
          currentAssets: money,
          currentLiabilities: money,
          revenue: money,
          source: z.string().min(1).max(500),
          status: z.literal("Draft").optional().default("Draft"),
        }).parse(input);
        return { ...financial, createdBy: previous ? (previous.data as { createdBy?: string }).createdBy : actor.key };
      }
      case "coverage":
        return z.object({
          countryCode: country,
          subdivision: z.string().min(1).max(100),
          excluded: z.boolean(),
          effectiveFrom: z.string(),
        }).parse(input);
      case "rule": {
        if (previous && (previous.data as { status?: string }).status !== "Draft") throw new DomainError(409, "immutable_published_version");
        return z.object({
          name: z.string().min(1).max(150),
          priority: z.number().int().min(0).max(1000),
          effectiveFrom: z.string(),
          validUntil: z.string(),
          field: z.enum(["country", "contractValue", "currentRatio", "experienceValue"]),
          operator: z.enum(["eq", "gte", "lte", "exclude"]),
          value: z.string().min(1).max(100),
          blocking: z.boolean(),
          status: z.literal("Draft").optional().default("Draft"),
        }).parse(input);
      }
      case "membership": {
        const membership = z.object({
          tenantId: z.string().uuid(),
          objectId: z.string().uuid(),
          roles: z.array(z.string()).min(1).max(7),
          active: z.boolean().optional().default(true),
        }).parse(input);
        if (membership.tenantId !== actor.tenantId) throw new DomainError(400, "invalid_membership");
        if (membership.tenantId === actor.tenantId && membership.objectId === actor.objectId) {
          throw new DomainError(409, "self_membership_change_forbidden");
        }
        return membership;
      }
      case "team":
        return z.object({ name: z.string().min(1).max(150), memberIds: z.array(z.string()).max(100) }).parse(input);
      case "sourcepolicy":
        return z.object({
          source: z.string().min(1).max(150),
          termsVersion: z.string().min(1).max(100),
          legalBasis: z.string().min(1).max(2000),
          reviewedOn: z.string(),
          authorized: z.boolean(),
        }).parse(input);
      default:
        throw new DomainError(400, "unsupported_resource");
    }
  }

  private async replay(companyId: string, commandId: string, fingerprint: string): Promise<Resource | null> {
    const receipt = await this.store.receipt(companyId, commandId);
    if (!receipt) return null;
    if (receipt.fingerprint !== fingerprint) throw new DomainError(409, "idempotency_conflict");
    return (await this.store.get(companyId, receipt.kind, receipt.resourceId)) ?? Promise.reject(new DomainError(409, "receipt_resource_missing"));
  }

  private async commit(
    actor: Actor,
    resource: Resource,
    previous: Resource | null,
    commandId: string,
    fingerprint: string,
    correlation: string,
    additional: { value: Resource; expectedVersion: number | null }[],
  ): Promise<void> {
    const now = new Date().toISOString();
    const audit: AuditEntry = {
      id: crypto.randomUUID(),
      companyId: resource.companyId,
      entityId: resource.id,
      actor: actor.key,
      action: `${resource.kind}.changed`,
      occurredAt: now,
      correlationId: correlation,
      before: previous,
      after: resource,
    };
    await this.store.apply({
      receipt: { id: commandId, companyId: resource.companyId, fingerprint, resourceId: resource.id, kind: resource.kind },
      writes: [{ value: resource, expectedVersion: previous?.version ?? null }, ...additional],
      audit,
      event: {
        eventId: crypto.randomUUID(),
        eventType: `${resource.kind}.changed.v1`,
        schemaVersion: 1,
        companyId: resource.companyId,
        entityId: resource.id,
        entityVersion: resource.version,
        occurredAt: now,
        source: "TenderOps",
        correlationId: correlation,
      },
    });
  }

  private checkKind(kind: string): void {
    if (!profileKinds.includes(kind as (typeof profileKinds)[number])) throw new DomainError(404, "resource_not_found");
  }
}
