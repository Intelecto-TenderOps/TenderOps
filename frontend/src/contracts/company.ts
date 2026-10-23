import type { Audited, Identified } from "./common";

export interface Company extends Identified, Audited {
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
}

export interface Capability extends Identified, Audited {
  companyId: string;
  name: string;
  description: string;
  sector: string;
  country: string;
  validUntil: string;
  active: boolean;
}

export interface Experience extends Identified, Audited {
  companyId: string;
  client: string;
  object: string;
  contractNumber: string;
  currency: "COP" | "USD";
  value: number;
  startDate: string;
  endDate: string;
  location: string;
  evidenceName: string;
  evidenceSharePointId: string | null;
  complete: boolean;
}

export interface FinancialSnapshot extends Identified, Audited {
  companyId: string;
  period: string;
  currency: "COP";
  equity: number;
  currentAssets: number;
  currentLiabilities: number;
  source: string;
  approver: string;
  status: "borrador" | "aprobado" | "vencido";
}

export interface GeoCoverage extends Identified {
  companyId: string;
  kind: "inclusion" | "exclusion";
  country: string;
  department: string;
  municipality: string;
}

export interface ParticipationRule extends Identified, Audited {
  companyId: string;
  name: string;
  priority: number;
  blocking: boolean;
  expression: string;
  owner: string;
  active: boolean;
}

export interface CompanyDocument extends Identified, Audited {
  companyId: string;
  name: string;
  type: string;
  validUntil: string;
  status: "vigente" | "por_vencer" | "vencido";
  sharePointId: string | null;
}

export interface Membership extends Identified {
  companyId: string;
  userId: string;
  name: string;
  email: string;
  role: RoleName;
  team: string;
  active: boolean;
}

export type RoleName =
  | "Administrador"
  | "Analista"
  | "Comercial"
  | "Jurídico"
  | "Financiero"
  | "Técnico"
  | "Lector";
