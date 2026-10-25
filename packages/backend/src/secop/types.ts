export type SecopSource = "SECOP_I" | "SECOP_II";

export type ComputedStatus =
  | "abierto"
  | "en_evaluacion"
  | "adjudicado"
  | "desierto"
  | "cerrado"
  | "por_verificar";

export interface MissingField {
  field: string;
  reason: string;
}

export interface NormalizedProcess {
  id: string;
  source: SecopSource;
  externalProcessId: string;
  processReference: string | null;
  portfolioId: string | null;
  entityName: string;
  entityNit: string | null;
  title: string;
  subject: string | null;
  phase: string | null;
  sourceStatus: string | null;
  sourceOpeningStatus: string | null;
  publicationDate: string | null;
  lastSourcePublicationDate: string | null;
  closingDate: string | null;
  closingDateConfidence: "confirmed" | "absent";
  estimatedValue: string | null;
  currency: "COP";
  modality: string | null;
  department: string | null;
  municipality: string | null;
  mainCategoryCode: string | null;
  contractType: string | null;
  sourceUrl: string | null;
  computedStatus: ComputedStatus;
  computedStatusConfidence: "high" | "medium" | "low";
  computedStatusReason: string;
  syncedAt: string;
  sourceUpdatedAt: string | null;
  missing: MissingField[];
  raw: Record<string, unknown>;
}

export interface ProcessSearchQuery {
  q?: string;
  source?: SecopSource | "all";
  entity?: string;
  nit?: string;
  department?: string;
  municipality?: string;
  modality?: string;
  status?: string;
  phase?: string;
  minValue?: number;
  maxValue?: number;
  publishedFrom?: string;
  publishedTo?: string;
  closingFrom?: string;
  closingTo?: number | string;
  unspsc?: string;
  sort?: "published" | "value" | "updated";
  pageSize?: number;
  cursor?: string;
  exactId?: string;
}

export interface AppliedFilter {
  id: string;
  field: string;
  label: string;
  value: string;
}

export interface ProcessSearchResult {
  items: NormalizedProcess[];
  total: number | null;
  totalIsApproximate: boolean;
  cursor: string | null;
  mode: "live" | "indexed" | "hybrid";
  sourceUpdatedAt: string | null;
  syncedAt: string;
  appliedFilters: AppliedFilter[];
  warnings: string[];
}
