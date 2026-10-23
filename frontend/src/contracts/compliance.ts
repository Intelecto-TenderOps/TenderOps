import type { CopiedState, RiskLevel } from "./common";

export type ComplianceStatus =
  | "cumple"
  | "no_cumple"
  | "pendiente"
  | "indeterminado"
  | "no_aplica";

export interface Requirement {
  id: string;
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
