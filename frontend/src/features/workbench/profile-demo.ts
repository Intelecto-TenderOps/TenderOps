import type { ProfileTransport, Resource } from "../profile";
import { WorkbenchError } from "./repository";
import type { WorkbenchContext, ViewRole } from "./types";

const permissions: Record<ViewRole, string[]> = {
  Administrator: [
    "profile.read",
    "profile.write",
    "company.write",
    "members.read",
    "members.write",
    "audit.read",
    "rules.write",
  ],
  Analyst: ["profile.read", "profile.write"],
  Commercial: ["profile.read", "rules.write"],
  Legal: ["profile.read", "sourcepolicy.write"],
  Financial: ["profile.read", "financial.read", "financial.write"],
  Approver: [
    "profile.read",
    "financial.read",
    "financial.approve",
    "rules.publish",
  ],
  Auditor: ["profile.read", "financial.read", "audit.read"],
};
export function demoPermissions(role: ViewRole): string[] {
  return permissions[role];
}
const stores = new Map<string, Resource[]>();
function resources(companyId: string): Resource[] {
  if (!stores.has(companyId)) {
    const company: Resource = {
      id: companyId,
      companyId,
      kind: "company",
      version: 1,
      data: {
        legalName: companyId.endsWith("2")
          ? "Oriente Soluciones SAS · ejemplo"
          : "Andina Tecnología SAS · ejemplo",
        countryCode: "CO",
        taxId: companyId.endsWith("2") ? "DEMO-B" : "DEMO-A",
      },
    };
    const row = (kind: string, data: Record<string, unknown>): Resource => ({
      id: crypto.randomUUID(),
      companyId,
      kind,
      version: 1,
      data,
    });
    const experience = row("experience", {
      client: "Entidad sintética de referencia",
      subject: "Implementación de plataforma empresarial",
      start: "2022-01-15",
      end: "2024-02-28",
      amount: "1250000000.1234",
      currency: "COP",
      status: "PendingEvidence",
    });
    stores.set(companyId, [
      company,
      row("capability", {
        name: "Transformación digital",
        description:
          "Diseño e implementación de plataformas empresariales y servicios públicos digitales.",
        countryCode: "CO",
        validUntil: "2027-12-31",
        active: true,
      }),
      experience,
      row("coverage", {
        countryCode: "CO",
        subdivision: "Bogotá D. C.",
        excluded: false,
        effectiveFrom: "2026-01-01",
      }),
      row("financial", {
        periodStart: "2025-01-01",
        periodEnd: "2025-12-31",
        validUntil: "2027-12-31",
        currency: "COP",
        assets: "4800000000",
        liabilities: "1200000000",
        currentAssets: "2400000000",
        currentLiabilities: "800000000",
        revenue: "6200000000",
        source: "Balance sintético de ejemplo",
        status: "Draft",
        createdBy: "Demostración · Financial",
      }),
      row("rule", {
        name: "Valor máximo de participación",
        priority: 10,
        effectiveFrom: "2026-01-01",
        validUntil: "2027-12-31",
        field: "contractValue",
        operator: "lte",
        value: "5000000000",
        blocking: true,
        status: "Draft",
      }),
      row("evidence", {
        experienceId: experience.id,
        fileName: "Contrato de referencia · ejemplo.pdf",
        sha256: "e".repeat(64),
        locator: "Sección Alcance",
        status: "PendingUpload",
      }),
      row("membership", {
        tenantId: "11111111-1111-1111-1111-111111111111",
        objectId: "22222222-2222-2222-2222-222222222222",
        roles: ["Administrator"],
        active: true,
      }),
      row("team", { name: "Comité de licitaciones", memberIds: [] }),
      row("sourcepolicy", {
        source: "SECOP II",
        termsVersion: "Pendiente de revisión real",
        legalBasis: "Registro de ejemplo. No autoriza una conexión externa.",
        reviewedOn: "2026-10-22",
        authorized: false,
      }),
    ]);
  }
  return stores.get(companyId)!;
}
function readPermission(kind: string): string {
  return kind === "financial"
    ? "financial.read"
    : ["membership", "team"].includes(kind)
      ? "members.read"
      : "profile.read";
}
function writePermission(kind: string): string {
  return (
    (
      {
        company: "company.write",
        financial: "financial.write",
        membership: "members.write",
        team: "members.write",
        rule: "rules.write",
        sourcepolicy: "sourcepolicy.write",
      } as Record<string, string>
    )[kind] ?? "profile.write"
  );
}
export function profileTransport(context: WorkbenchContext): ProfileTransport {
  function check(companyId: string, permission: string): void {
    if (
      !context.demo ||
      companyId !== context.companyId ||
      !context.permissions.includes(permission)
    )
      throw new WorkbenchError(
        "permission_denied",
        "No tienes permiso para esta operación del perfil.",
      );
  }
  return {
    async list(companyId, kind, offset, signal) {
      check(companyId, readPermission(kind));
      signal?.throwIfAborted();
      const rows = resources(companyId).filter((row) => row.kind === kind);
      return structuredClone({
        items: rows.slice(offset, offset + 10),
        offset,
        limit: 10,
        hasMore: rows.length > offset + 10,
      });
    },
    async save(companyId, kind, data, previous) {
      check(companyId, writePermission(kind));
      const rows = resources(companyId);
      const current = previous
        ? rows.find((row) => row.id === previous.id && row.kind === kind)
        : undefined;
      if (previous && (!current || current.version !== previous.version))
        throw new WorkbenchError(
          "version_conflict",
          "El registro cambió. Recarga antes de guardar.",
        );
      if (
        current &&
        ["Approved", "Published"].includes(String(current.data.status))
      )
        throw new WorkbenchError(
          "immutable",
          "Una versión aprobada o publicada no se puede modificar.",
        );
      if (
        kind === "evidence" &&
        !rows.some(
          (row) => row.kind === "experience" && row.id === data.experienceId,
        )
      )
        throw new WorkbenchError(
          "invalid_reference",
          "La experiencia debe pertenecer a esta empresa.",
        );
      if (
        kind === "team" &&
        Array.isArray(data.memberIds) &&
        data.memberIds.some(
          (id) =>
            !rows.some((row) => row.kind === "membership" && row.id === id),
        )
      )
        throw new WorkbenchError(
          "invalid_reference",
          "Selecciona membresías de esta empresa.",
        );
      const payload = {
        ...data,
        ...(kind === "financial"
          ? {
              status: "Draft",
              createdBy:
                current?.data.createdBy ?? `Demostración · ${context.role}`,
            }
          : kind === "rule"
            ? { status: "Draft" }
            : {}),
      };
      const saved: Resource = {
        id: current?.id ?? crypto.randomUUID(),
        companyId,
        kind,
        version: (current?.version ?? 0) + 1,
        data: payload,
      };
      if (current) rows.splice(rows.indexOf(current), 1, saved);
      else rows.push(saved);
      return structuredClone(saved);
    },
    async approve(companyId, kind, previous) {
      check(
        companyId,
        kind === "financial" ? "financial.approve" : "rules.publish",
      );
      const current = resources(companyId).find(
        (row) => row.id === previous.id && row.kind === kind,
      );
      if (!current || current.version !== previous.version)
        throw new WorkbenchError("version_conflict", "La versión cambió.");
      if (current.data.status !== "Draft")
        throw new WorkbenchError("immutable", "La versión ya fue aprobada.");
      if (
        kind === "financial" &&
        current.data.createdBy === `Demostración · ${context.role}`
      )
        throw new WorkbenchError(
          "separate_approver_required",
          "La aprobación requiere otra persona.",
        );
      current.data = {
        ...current.data,
        status: kind === "financial" ? "Approved" : "Published",
        approvedBy: `Demostración · ${context.role}`,
      };
      current.version++;
      return structuredClone(current);
    },
  };
}
