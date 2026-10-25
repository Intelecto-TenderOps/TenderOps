import type { Recommendation, RiskLevel } from "./common";

export type TenderStatus =
  | "abierto"
  | "en_evaluacion"
  | "adjudicado"
  | "desierto"
  | "cerrado";

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
  source: "SECOP I" | "SECOP II";
  compatibility: number;
  risk: RiskLevel;
  recommendation: Recommendation;
  owner: string;
  favorite: boolean;
  watching: boolean;
  dynamicsOpportunityId: string | null;
  tags: string[];
}

export interface TenderFilters {
  search?: string;
  modalities?: string[];
  departments?: string[];
  statuses?: TenderStatus[];
  minValue?: number;
  owners?: string[];
  onlyFavorites?: boolean;
  onlyWatching?: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: TenderFilters;
  createdAt: string;
}
