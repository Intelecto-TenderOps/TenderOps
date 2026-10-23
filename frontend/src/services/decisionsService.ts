import type { Decision, Recommendation } from "@/contracts";
import { createId } from "@/lib/ids";
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
      simulated: false,
    };
    writeWorkspace((workspace) => ({
      ...workspace,
      decisions: [decision, ...workspace.decisions.filter((item) => item.tenderId !== input.tenderId)],
      auditEvents: [
        {
          id: createId("aud"),
          actor: input.decidedBy,
          action: `Registró decisión ${input.decided}`,
          entity: input.tenderId,
          correlationId: createId("corr"),
          at: new Date().toISOString(),
        },
        ...workspace.auditEvents,
      ],
    }));
    return simulateLatency(decision);
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
