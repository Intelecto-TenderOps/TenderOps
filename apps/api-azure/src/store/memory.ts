import { DomainError } from "../shared/errors.js";
import type { Actor, AuditEntry, CommandReceipt, Resource } from "../shared/types.js";
import type { CatalogProcess } from "../domains/secop/normalize.js";
import type {
  BusinessStore,
  SecopChange,
  SecopCursor,
  SecopSyncRun,
  TenderCandidate,
  WorkspaceTables,
} from "./types.js";
import type { AuditEvent } from "../contracts/workspace.js";

interface Lock {
  owner: string;
  until: number;
}

function emptyWorkspace(): WorkspaceTables {
  return {
    companies: [],
    memberships: [],
    tenders: [],
    assessments: [],
    requirements: [],
    decisions: [],
    approvals: [],
    tasks: [],
    opportunities: [],
    documents: [],
    alerts: [],
    searches: [],
    sources: [],
    auditEvents: [],
    copilotThread: [],
    criterionWeights: [],
    companyDocuments: [],
  };
}

export class MemoryStore implements BusinessStore {
  private readonly rows = new Map<string, Resource>();
  private readonly receipts = new Map<string, CommandReceipt>();
  private readonly audits: AuditEntry[] = [];
  private readonly processes = new Map<string, CatalogProcess>();
  private readonly changes: SecopChange[] = [];
  private readonly cursors = new Map<string, SecopCursor>();
  private readonly syncs: SecopSyncRun[] = [];
  private readonly locks = new Map<string, Lock>();
  private readonly candidates = new Map<string, TenderCandidate>();
  private readonly workspaces = new Map<string, WorkspaceTables>();
  private readonly events: AuditEvent[] = [];

  private key(companyId: string, kind: string, id: string): string {
    return `${companyId}:${kind}:${id}`;
  }

  async get(companyId: string, kind: string, id: string): Promise<Resource | null> {
    return this.rows.get(this.key(companyId, kind, id)) ?? null;
  }

  async list(companyId: string, kind: string, offset: number, limit: number): Promise<Resource[]> {
    return [...this.rows.values()]
      .filter((row) => row.companyId === companyId && row.kind === kind)
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(offset, offset + limit);
  }

  async memberships(actor: Actor): Promise<Resource[]> {
    return [...this.rows.values()].filter((row) => {
      if (row.kind !== "membership") return false;
      const data = row.data as { tenantId?: string; objectId?: string; active?: boolean };
      return data.active !== false && data.tenantId === actor.tenantId && data.objectId === actor.objectId;
    });
  }

  async receipt(companyId: string, commandId: string): Promise<CommandReceipt | null> {
    return this.receipts.get(`${companyId}:${commandId}`) ?? null;
  }

  async apply(input: {
    receipt: CommandReceipt;
    writes: { value: Resource; expectedVersion: number | null }[];
    audit: AuditEntry;
    event: { eventId: string };
  }): Promise<void> {
    const receiptKey = `${input.receipt.companyId}:${input.receipt.id}`;
    const existing = this.receipts.get(receiptKey);
    if (existing) {
      if (existing.fingerprint !== input.receipt.fingerprint) throw new DomainError(409, "idempotency_conflict");
      return;
    }
    for (const write of input.writes) {
      if (write.value.companyId !== input.receipt.companyId) throw new DomainError(400, "invalid_company_reference");
      const current = this.rows.get(this.key(write.value.companyId, write.value.kind, write.value.id));
      if (write.expectedVersion !== (current?.version ?? null)) {
        throw new DomainError(current ? 412 : 404, "version_conflict");
      }
    }
    for (const write of input.writes) {
      this.rows.set(this.key(write.value.companyId, write.value.kind, write.value.id), write.value);
    }
    this.receipts.set(receiptKey, input.receipt);
    this.audits.push(input.audit);
  }

  async audit(companyId: string, offset: number, limit: number): Promise<AuditEntry[]> {
    return this.audits.filter((entry) => entry.companyId === companyId).slice(offset, offset + limit);
  }

  async getProcess(id: string): Promise<CatalogProcess | null> {
    return this.processes.get(id) ?? [...this.processes.values()].find((item) => item.externalId === id) ?? null;
  }

  async findProcess(source: string, externalId: string): Promise<CatalogProcess | null> {
    return [...this.processes.values()].find((item) => item.source === source && item.externalId === externalId) ?? null;
  }

  async listProcesses(): Promise<CatalogProcess[]> {
    return [...this.processes.values()];
  }

  async upsertProcess(process: CatalogProcess, change?: SecopChange): Promise<CatalogProcess> {
    this.processes.set(process.id, process);
    if (change) this.changes.push(change);
    return process;
  }

  async deleteProcess(id: string): Promise<void> {
    this.processes.delete(id);
  }

  async saveCursor(cursor: SecopCursor): Promise<void> {
    this.cursors.set(cursor.id, cursor);
  }

  async getCursor(id: string): Promise<SecopCursor | null> {
    return this.cursors.get(id) ?? null;
  }

  async saveSync(run: SecopSyncRun): Promise<void> {
    const index = this.syncs.findIndex((item) => item.id === run.id);
    if (index >= 0) this.syncs[index] = run;
    else this.syncs.push(run);
  }

  async lastSync(kind: string): Promise<SecopSyncRun | null> {
    return [...this.syncs].reverse().find((item) => item.kind === kind) ?? null;
  }

  async listChanges(processId?: string): Promise<SecopChange[]> {
    return processId ? this.changes.filter((item) => item.processId === processId) : this.changes;
  }

  async acquireLock(name: string, owner: string, ttlMs: number): Promise<boolean> {
    const current = this.locks.get(name);
    if (current && current.until > Date.now() && current.owner !== owner) return false;
    this.locks.set(name, { owner, until: Date.now() + ttlMs });
    return true;
  }

  async releaseLock(name: string, owner: string): Promise<void> {
    const current = this.locks.get(name);
    if (current?.owner === owner) this.locks.delete(name);
  }

  async getCandidate(companyId: string, processId: string): Promise<TenderCandidate | null> {
    return this.candidates.get(`${companyId}:${processId}`) ?? null;
  }

  async listCandidates(companyId: string): Promise<TenderCandidate[]> {
    return [...this.candidates.values()].filter((item) => item.companyId === companyId);
  }

  async saveCandidate(candidate: TenderCandidate): Promise<void> {
    this.candidates.set(`${candidate.companyId}:${candidate.processId}`, candidate);
  }

  private workspaceOf(companyId: string): WorkspaceTables {
    const current = this.workspaces.get(companyId);
    if (current) return current;
    const created = emptyWorkspace();
    this.workspaces.set(companyId, created);
    return created;
  }

  async workspace(companyId: string): Promise<WorkspaceTables> {
    return structuredClone(this.workspaceOf(companyId));
  }

  async saveWorkspace(companyId: string, tables: Partial<WorkspaceTables>): Promise<void> {
    const current = this.workspaceOf(companyId);
    this.workspaces.set(companyId, { ...current, ...tables });
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    this.events.unshift(event);
    const workspace = this.workspaceOf(event.companyId);
    workspace.auditEvents.unshift(event);
  }
}

export const memoryStore = new MemoryStore();
