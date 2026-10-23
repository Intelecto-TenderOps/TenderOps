export type ViewRole =
  | "Administrator"
  | "Analyst"
  | "Commercial"
  | "Legal"
  | "Financial"
  | "Approver"
  | "Auditor";
export type Stage =
  | "Descubierta"
  | "Evaluación"
  | "Decisión"
  | "Preparación"
  | "Presentada"
  | "Cerrada";
export type Compliance =
  | "Cumple"
  | "No cumple"
  | "Pendiente de evidencia"
  | "Indeterminado"
  | "No aplica";
export interface Opportunity {
  id: string;
  reference: string;
  title: string;
  buyer: string;
  buyerTaxId: string;
  country: string;
  region: string;
  modality: string;
  source: string;
  amount: string;
  currency: string;
  closesAt: string;
  timezone: string;
  publishedAt: string;
  stage: Stage;
  fit: number | null;
  confidence: number | null;
  recommendation: string;
  owner: string;
  triage: string;
  triageReason: string;
  version: number;
  analysisVersion: number;
  stale: boolean;
  description: string;
  tags: string[];
  account: string | null;
  outcome?: string;
  outcomeReason?: string;
}
export interface DocumentRecord {
  id: string;
  opportunityId: string;
  name: string;
  category: string;
  version: number;
  hash: string;
  status: "Available" | "Quarantined" | "Scanning" | "Rejected";
  size: string;
  uploadedAt: string;
  review: "Pendiente" | "Revisado" | "Devuelto";
  reviewer: string;
  comment: string;
  content: string;
  locator: string;
  supersedes: string | null;
  engine: string;
  confidence: number | null;
}
export interface Requirement {
  id: string;
  opportunityId: string;
  title: string;
  category: string;
  mandatory: boolean;
  status: Compliance;
  documentId: string;
  documentVersion: number;
  locator: string;
  quote: string;
  evidence: string;
  owner: string;
  action: string;
  score: string;
  scoreKind: "Calculado" | "Estimado" | "Desconocido";
}
export interface Approval {
  id: string;
  opportunityId: string;
  discipline: string;
  status: string;
  actor: string;
  comment: string;
  analysisVersion: number;
  date: string;
}
export interface Decision {
  id: string;
  opportunityId: string;
  result: string;
  reason: string;
  actor: string;
  date: string;
  analysisVersion: number;
  version: number;
}
export interface ChecklistItem {
  id: string;
  opportunityId: string;
  requirementId: string;
  title: string;
  owner: string;
  due: string;
  state: string;
  dependencyId: string | null;
  evidenceId: string;
  note: string;
  manualDate: boolean;
  taskId: string;
}
export interface TaskRecord {
  id: string;
  opportunityId: string;
  title: string;
  owner: string;
  due: string;
  state: string;
  priority: string;
  note: string;
  evidenceId: string;
  manualDate: boolean;
  version: number;
}
export interface Comment {
  id: string;
  opportunityId: string;
  author: string;
  text: string;
  at: string;
}
export interface Escalation {
  id: string;
  opportunityId: string;
  title: string;
  severity: string;
  owner: string;
  due: string;
  status: string;
  resolution: string;
}
export interface Baseline {
  id: string;
  opportunityId: string;
  analysisVersion: number;
  profileVersion: number;
  ruleVersion: number;
  at: string;
  actor: string;
  documents: { id: string; version: number; hash: string }[];
}
export interface Waiver {
  id: string;
  opportunityId: string;
  requirementId: string;
  reason: string;
  until: string;
  actor: string;
}
export interface Source {
  id: string;
  name: string;
  country: string;
  available: boolean;
  enabled: boolean;
  status: string;
  lastRun: string;
  interval: number;
  termsVersion: string;
  authorized: boolean;
  accepted: number;
  rejected: number;
  duplicates: number;
}
export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  region: string;
  modality: string;
  source: string;
  minAmount: string;
  maxAmount: string;
  from: string;
  until: string;
  active: boolean;
}
export interface Alert {
  id: string;
  opportunityId: string;
  title: string;
  reason: string;
  kind: string;
  urgency: string;
  read: boolean;
  mutedUntil: string;
  at: string;
}
export interface Job {
  id: string;
  type: string;
  opportunityId: string;
  status: "Pendiente" | "En curso" | "Completado" | "Fallido";
  progress: number;
  error: string;
  transient: boolean;
  attempts: number;
  correlationId: string;
  createdAt: string;
  polls: number;
  result: string;
}
export interface SyncRecord {
  id: string;
  opportunityId: string;
  status: string;
  direction: string;
  lastSync: string;
  account: string;
  externalId: string;
  conflictField: string;
  localValue: string;
  remoteValue: string;
  resolution: string;
  currency: string;
  manualFields: string[];
}
export interface AuditEvent {
  id: string;
  opportunityId: string;
  action: string;
  actor: string;
  at: string;
  detail: string;
  correlationId: string;
}
export interface Preferences {
  email: boolean;
  teams: boolean;
  internal: boolean;
  quietStart: string;
  quietEnd: string;
  timezone: string;
  warningDays: number;
  retentionDays: string;
  legalHold: boolean;
  environment: string;
}
export interface Member {
  id: string;
  name: string;
  role: ViewRole;
}
export interface CompanyDocument {
  id: string;
  name: string;
  type: string;
  issuedOn: string;
  validUntil: string;
  owner: string;
  version: number;
  source: string;
  status: string;
}
export interface ServiceObjective {
  id: string;
  name: string;
  metric: string;
  target: string;
  window: string;
  exclusions: string;
  status: string;
}
export interface WorkspaceData {
  opportunities: Opportunity[];
  documents: DocumentRecord[];
  requirements: Requirement[];
  approvals: Approval[];
  decisions: Decision[];
  checklist: ChecklistItem[];
  tasks: TaskRecord[];
  comments: Comment[];
  escalations: Escalation[];
  baselines: Baseline[];
  waivers: Waiver[];
  sources: Source[];
  searches: SavedSearch[];
  alerts: Alert[];
  jobs: Job[];
  sync: SyncRecord[];
  audit: AuditEvent[];
  preferences: Preferences;
  members: Member[];
  companyDocuments: CompanyDocument[];
  serviceObjectives: ServiceObjective[];
}
export interface WorkbenchContext {
  companyId: string;
  companyName: string;
  demo: boolean;
  role: ViewRole;
  csrf: string;
  permissions: string[];
  base: string;
}
export interface Filters {
  query: string;
  region: string;
  modality: string;
  source: string;
  minAmount: string;
  maxAmount: string;
  from: string;
  until: string;
  stage: string;
}
export interface Command {
  type: string;
  id?: string;
  opportunityId?: string;
  values: Record<string, unknown>;
}
