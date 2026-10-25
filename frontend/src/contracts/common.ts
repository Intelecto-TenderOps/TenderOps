export type RiskLevel = "bajo" | "medio" | "alto" | "critico";
export type Recommendation = "BID" | "NO_BID" | "REVISION";
export type CopiedState =
  | "pendiente"
  | "en_proceso"
  | "listo_no_cargado"
  | "cargado";

export interface Identified {
  id: string;
}

export interface Audited {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface FilterChip {
  id: string;
  field: string;
  label: string;
  value: string;
}

export interface PagedQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filters?: FilterChip[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ServiceMeta {
  source: "demo" | "azure-functions";
  simulated: boolean;
}
