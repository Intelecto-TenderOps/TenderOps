import { loadEnv } from "../config/env.js";
import { requireConfigured } from "./status.js";

export const COPILOT_AGENTS = [
  { id: "orchestrator", env: "COPILOT_ORCHESTRATOR_AGENT_ID", name: "Orquestador" },
  { id: "viability", env: "COPILOT_VIABILITY_AGENT_ID", name: "Viabilidad y cumplimiento" },
  { id: "strategy", env: "COPILOT_STRATEGY_AGENT_ID", name: "Estrategia" },
  { id: "observations", env: "COPILOT_OBSERVATIONS_AGENT_ID", name: "Observaciones" },
  { id: "document", env: "COPILOT_DOCUMENT_AGENT_ID", name: "Documental" },
  { id: "candidates", env: "COPILOT_CANDIDATES_AGENT_ID", name: "Candidatos" },
] as const;

export class CopilotStudioGateway {
  constructor(private readonly env = loadEnv()) {}

  listAgents() {
    return COPILOT_AGENTS.map((agent) => ({
      id: agent.id,
      name: agent.name,
      configured: Boolean(this.env[agent.env as keyof typeof this.env]),
    }));
  }

  async execute(agentId: string, input: Record<string, unknown>) {
    const configured = requireConfigured("copilot");
    if (!configured.ok) return configured;
    void agentId;
    void input;
    return {
      ok: false as const,
      error: {
        code: "copilot_unverified",
        integration: "copilot",
        message: "El gateway está implementado; la ejecución real requiere el mecanismo autorizado (Agents SDK o Direct Line) y credenciales verificadas.",
        missing: ["COPILOT_CONNECTION_STRING"],
      },
    };
  }
}
