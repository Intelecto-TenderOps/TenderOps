export type CopilotAgent =
  | "orquestador"
  | "viabilidad"
  | "estrategia"
  | "observaciones"
  | "documentos"
  | "candidatos";

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  agent: CopilotAgent;
  body: string;
  createdAt: string;
  findings?: string[];
  table?: { headers: string[]; rows: string[][] };
  recommendation?: string;
  references?: string[];
  status?: "ejecutando" | "listo" | "error";
  proposedAction?: {
    type: string;
    label: string;
    payload: Record<string, string>;
  };
}

export interface CopilotRun {
  id: string;
  agent: CopilotAgent;
  status: "ejecutando" | "listo" | "error";
  startedAt: string;
  finishedAt: string | null;
}
