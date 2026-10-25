export type RiskLevel = "bajo" | "medio" | "alto" | "critico";
export type Recommendation = "BID" | "NO_BID" | "REVISION";
export type CopiedState = "pendiente" | "en_proceso" | "listo_no_cargado" | "cargado";
export type TenderStatus = "abierto" | "en_evaluacion" | "adjudicado" | "desierto" | "cerrado";
export type ComplianceStatus = "cumple" | "no_cumple" | "pendiente" | "indeterminado" | "no_aplica";
export type RoleLabel =
  | "Administrador"
  | "Analista"
  | "Comercial"
  | "Jurídico"
  | "Financiero"
  | "Técnico"
  | "Lector";

export interface Tender {
  id: string;
  tenderOpsId: string;
  secopId: string;
  sourceUrl: string;
  entity: string;
  entityTaxId: string;
  object: string;
  modality: string;
  value: number;
  currency: "COP";
  department: string;
  municipality: string;
  publishedAt: string;
  closesAt: string;
  status: TenderStatus;
  source: "SECOP II" | "SECOP I";
  compatibility: number;
  risk: RiskLevel;
  recommendation: Recommendation;
  owner: string;
  favorite: boolean;
  watching: boolean;
  dynamicsOpportunityId: string | null;
  tags: string[];
  provenance?: "catalog" | "secop";
  sourceUpdatedAt?: string | null;
  freshness?: "fresh" | "stale" | "unknown";
}

export interface TenderFilters {
  search?: string;
  modalities?: string[];
  departments?: string[];
  statuses?: TenderStatus[];
  minValue?: number;
  maxValue?: number;
  owners?: string[];
  onlyFavorites?: boolean;
  onlyWatching?: boolean;
  entity?: string;
  taxId?: string;
  municipality?: string;
  phase?: string;
  from?: string;
  until?: string;
  unspsc?: string;
  exactId?: string;
  source?: "SECOP II" | "SECOP I" | "all";
}

export interface SavedSearch {
  id: string;
  companyId: string;
  name: string;
  filters: TenderFilters;
  active: boolean;
  createdAt: string;
}

export interface Assessment {
  id: string;
  companyId: string;
  tenderId: string;
  score: number;
  risk: RiskLevel;
  compatibility: number;
  experience: number;
  financial: number;
  legal: number;
  technical: number;
  scoring: number;
  confidence: number;
  blocked: boolean;
  blockReason: string | null;
  recommendation: Recommendation;
  explanation: string;
  version: number;
  updatedAt: string;
}

export interface CriterionWeight {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
}

export interface Requirement {
  id: string;
  companyId: string;
  tenderId: string;
  code: string;
  category: "jurídico" | "financiero" | "técnico" | "experiencia" | "puntaje";
  requirement: string;
  condition: string;
  source: string;
  evidence: string;
  compliance: ComplianceStatus;
  risk: RiskLevel;
  owner: string;
  dueDate: string;
  status: "abierto" | "en_revision" | "cerrado";
  copied: CopiedState;
  notes: string;
  sharePointId: string | null;
}

export interface Decision {
  id: string;
  companyId: string;
  tenderId: string;
  recommended: Recommendation;
  decided: Recommendation | null;
  decidedBy: string | null;
  decidedAt: string | null;
  rationale: string;
  risks: string[];
  blockers: string[];
  version: number;
  simulated: boolean;
}

export interface Approval {
  id: string;
  companyId: string;
  tenderId: string;
  discipline: "jurídico" | "técnico" | "financiero" | "comercial";
  reviewer: string;
  status: "pendiente" | "aprobado" | "rechazado";
  comment: string;
  updatedAt: string;
}

export interface WorkTask {
  id: string;
  companyId: string;
  tenderId: string | null;
  title: string;
  description: string;
  owners: string[];
  status: "pendiente" | "en_curso" | "bloqueada" | "hecha";
  priority: "baja" | "media" | "alta" | "urgente";
  category: string;
  dueDate: string;
  evidence: string | null;
  dynamicsTaskId: string | null;
}

export interface CommercialOpportunity {
  id: string;
  companyId: string;
  tenderId: string;
  dynamicsOpportunityId: string;
  dynamicsAccountId: string;
  account: string;
  name: string;
  value: number;
  owner: string;
  stage: "calificación" | "propuesta" | "negociación" | "ganada" | "perdida";
  status: "abierta" | "cerrada";
  outcome: "ganada" | "perdida" | null;
  activities: number;
  tasks: number;
  documents: number;
  createdAt: string;
}

export interface ProcessDocument {
  id: string;
  companyId: string;
  tenderId: string;
  name: string;
  category: string;
  version: number;
  status: "disponible" | "en_revision" | "cuarentena";
  reviewed: boolean;
  sizeKb: number;
  uploadedAt: string;
  sharePointId: string | null;
  excerpt: string;
}

export interface AlertItem {
  id: string;
  companyId: string;
  tenderId: string;
  kind: "nueva" | "cambio" | "adenda" | "vencimiento" | "riesgo";
  title: string;
  detail: string;
  urgency: "baja" | "media" | "alta";
  read: boolean;
  silenced: boolean;
  createdAt: string;
}

export interface Company {
  id: string;
  legalName: string;
  tradeName: string;
  taxId: string;
  countryCode: "CO";
  city: string;
  department: string;
  email: string;
  phone: string;
  website: string;
  legalRep: string;
  status: "activa" | "inactiva";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Membership {
  id: string;
  companyId: string;
  userId: string;
  tenantId: string;
  objectId: string;
  name: string;
  email: string;
  role: RoleLabel;
  team: string;
  active: boolean;
}

export interface SourceConfig {
  id: string;
  companyId: string;
  name: string;
  country: "CO";
  enabled: boolean;
  authorized: boolean;
  termsVersion: string;
  lastSync: string | null;
  health: "ok" | "atrasada" | "error";
}

export interface AuditEvent {
  id: string;
  companyId: string;
  actor: string;
  action: string;
  entity: string;
  correlationId: string;
  at: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  system: "Dynamics 365" | "Dataverse" | "SharePoint" | "Entra ID" | "SECOP" | "Copilot Studio";
  status: "simulada" | "desconectada" | "saludable" | "degradada";
  lastSync: string | null;
  note: string;
}

export interface CopilotMessage {
  id: string;
  companyId: string;
  role: "user" | "assistant" | "system";
  agent: "orquestador" | "viabilidad" | "estrategia" | "observaciones" | "documentos" | "candidatos";
  body: string;
  createdAt: string;
  findings?: string[];
  table?: { headers: string[]; rows: string[][] };
  recommendation?: string;
  references?: string[];
  status?: "ejecutando" | "listo" | "error";
  proposedAction?: { type: string; label: string; payload: Record<string, string> };
}

export interface AnalyticsSnapshot {
  detected: number;
  evaluated: number;
  recommended: number;
  discarded: number;
  closingSoon: number;
  inDynamics: number;
  overdueTasks: number;
  winRate: number;
  funnel: { stage: string; count: number }[];
  byModality: { name: string; value: number }[];
  byEntity: { name: string; value: number }[];
}

export interface CompanyWorkspace {
  companyId: string;
  companies: Company[];
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
  memberships: Membership[];
  sources: SourceConfig[];
  auditEvents: AuditEvent[];
  integrations: IntegrationStatus[];
  copilotThread: CopilotMessage[];
  criterionWeights: CriterionWeight[];
}
