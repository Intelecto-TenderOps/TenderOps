import type { CatalogProcess } from "../domains/secop/normalize.js";
import type {
  AlertItem,
  Approval,
  Assessment,
  AuditEvent,
  CommercialOpportunity,
  Company,
  CopilotMessage,
  CriterionWeight,
  Decision,
  Membership,
  ProcessDocument,
  Requirement,
  SavedSearch,
  SourceConfig,
  Tender,
  WorkTask,
} from "../contracts/workspace.js";
import type { Actor, AuditEntry, CommandReceipt, IntegrationEvent, Resource } from "../shared/types.js";

export interface SecopChange {
  id: string;
  processId: string;
  fields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  at: string;
}

export interface SecopSyncRun {
  id: string;
  kind: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "error" | "partial";
  fetched: number;
  upserted: number;
  changed: number;
  skipped: number;
  error?: string;
  cursor?: string;
}

export interface SecopCursor {
  id: string;
  source: string;
  watermark: string;
  offset: number;
  updatedAt: string;
}

export interface TenderCandidate {
  id: string;
  companyId: string;
  processId: string;
  favorite: boolean;
  watching: boolean;
  owner: string;
  analyzed: boolean;
  decided: boolean;
  opportunityId: string | null;
}

export interface OutboxItem {
  event: IntegrationEvent;
  version: number;
  leaseUntil?: string;
  leaseOwner?: string;
  published: boolean;
}

export interface CompanyDocumentRecord {
  id: string;
  companyId: string;
  name: string;
  type: string;
  validUntil: string;
  status: "vigente" | "por_vencer" | "vencido";
  sharePointId: string | null;
  issuedOn?: string;
}

export interface WorkspaceTables {
  companies: Company[];
  memberships: Membership[];
  tenders: Tender[];
  assessments: Assessment[];
  requirements: Requirement[];
  decisions: Decision[];
  approvals: Approval[];
  tasks: WorkTask[];
  opportunities: CommercialOpportunity[];
  documents: ProcessDocument[];
  alerts: AlertItem[];
  searches: SavedSearch[];
  sources: SourceConfig[];
  auditEvents: AuditEvent[];
  copilotThread: CopilotMessage[];
  criterionWeights: CriterionWeight[];
  companyDocuments: CompanyDocumentRecord[];
}

export interface BusinessStore {
  get(companyId: string, kind: string, id: string): Promise<Resource | null>;
  list(companyId: string, kind: string, offset: number, limit: number): Promise<Resource[]>;
  memberships(actor: Actor): Promise<Resource[]>;
  receipt(companyId: string, commandId: string): Promise<CommandReceipt | null>;
  apply(input: {
    receipt: CommandReceipt;
    writes: { value: Resource; expectedVersion: number | null }[];
    audit: AuditEntry;
    event: IntegrationEvent;
  }): Promise<void>;
  audit(companyId: string, offset: number, limit: number): Promise<AuditEntry[]>;
  getProcess(id: string): Promise<CatalogProcess | null>;
  findProcess(source: string, externalId: string): Promise<CatalogProcess | null>;
  listProcesses(): Promise<CatalogProcess[]>;
  upsertProcess(process: CatalogProcess, change?: SecopChange): Promise<CatalogProcess>;
  deleteProcess(id: string): Promise<void>;
  saveCursor(cursor: SecopCursor): Promise<void>;
  getCursor(id: string): Promise<SecopCursor | null>;
  saveSync(run: SecopSyncRun): Promise<void>;
  lastSync(kind: string): Promise<SecopSyncRun | null>;
  listChanges(processId?: string): Promise<SecopChange[]>;
  acquireLock(name: string, owner: string, ttlMs: number): Promise<boolean>;
  releaseLock(name: string, owner: string): Promise<void>;
  getCandidate(companyId: string, processId: string): Promise<TenderCandidate | null>;
  listCandidates(companyId: string): Promise<TenderCandidate[]>;
  saveCandidate(candidate: TenderCandidate): Promise<void>;
  workspace(companyId: string): Promise<WorkspaceTables>;
  saveWorkspace(companyId: string, tables: Partial<WorkspaceTables>): Promise<void>;
  appendAudit(event: AuditEvent): Promise<void>;
}
