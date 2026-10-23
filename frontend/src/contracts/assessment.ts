import type { Recommendation, RiskLevel } from "./common";

export interface Assessment {
  id: string;
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
