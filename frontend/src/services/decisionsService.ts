import type { Decision, Recommendation } from "@/contracts";
import { createId } from "@/lib/ids";
import { apiPost, isIntegrationUnconfigured, readIntegrationError } from "./http";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export const decisionsService = {
  async get(tenderId: string) {
    return simulateLatency(readWorkspace().decisions.find((item) => item.tenderId === tenderId) ?? null);
  },
  async record(input: {
    tenderId: string;
    decided: Recommendation;
    rationale: string;
    decidedBy: string;
  }) {
    let persisted = false;
    let message = "Decisión conservada solo en el espacio local.";
    try {
      await apiPost("/api/v1/decisions", input);
      persisted = true;
      message = "Decisión enviada a Dataverse.";
    } catch (error) {
      const info = readIntegrationError(error);
      message = isIntegrationUnconfigured(error)
        ? "Dataverse no está configurado. La decisión no se publicó a Dynamics ni a Dataverse."
        : info.message;
    }
    const decision: Decision = {
      id: createId("dec"),
      tenderId: input.tenderId,
      recommended: readWorkspace().assessments.find((item) => item.tenderId === input.tenderId)?.recommendation ?? "REVISION",
      decided: input.decided,
      decidedBy: input.decidedBy,
      decidedAt: new Date().toISOString(),
      rationale: input.rationale,
      risks: [],
      blockers: [],
      version: 1,
      simulated: !persisted,
    };
    writeWorkspace((workspace) => ({
      ...workspace,
      decisions: [decision, ...workspace.decisions.filter((item) => item.tenderId !== input.tenderId)],
      auditEvents: [
        {
          id: createId("aud"),
          actor: input.decidedBy,
          action: persisted ? `Registró decisión ${input.decided}` : `Borrador local ${input.decided} (Dataverse no configurado)`,
          entity: input.tenderId,
          correlationId: createId("corr"),
          at: new Date().toISOString(),
        },
        ...workspace.auditEvents,
      ],
    }));
    return { item: decision, persisted, message };
  },
  async comment(tenderId: string, author: string, body: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      comments: [
        {
          id: createId("cmt"),
          tenderId,
          author,
          body,
          createdAt: new Date().toISOString(),
        },
        ...workspace.comments,
      ],
    }));
    return simulateLatency(true);
  },
};
