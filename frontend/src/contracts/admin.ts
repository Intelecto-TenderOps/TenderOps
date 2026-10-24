export interface IntegrationStatus {
  id: string;
  name: string;
  system: "Dynamics 365" | "Dataverse" | "SharePoint" | "Entra ID" | "SECOP" | "Copilot Studio" | "Plataforma";
  status: "simulada" | "desconectada" | "saludable" | "degradada";
  lastSync: string | null;
  note: string;
  missing?: string[];
  configured?: boolean;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  correlationId: string;
  at: string;
}

export interface SourceConfig {
  id: string;
  name: string;
  country: "CO";
  enabled: boolean;
  lastSync: string | null;
  health: "ok" | "atrasada" | "error";
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
  source?: "live" | "demo";
  notes?: string[];
  integrations?: { dynamics: boolean; dataverse: boolean; copilot: boolean };
}
