import type { Recommendation } from "./common";

export interface Decision {
  id: string;
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
  tenderId: string;
  discipline: "jurídico" | "técnico" | "financiero" | "comercial";
  reviewer: string;
  status: "pendiente" | "aprobado" | "rechazado";
  comment: string;
  updatedAt: string;
}

export interface DecisionComment {
  id: string;
  tenderId: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Escalation {
  id: string;
  tenderId: string;
  reason: string;
  owner: string;
  status: "abierta" | "resuelta";
  createdAt: string;
}
