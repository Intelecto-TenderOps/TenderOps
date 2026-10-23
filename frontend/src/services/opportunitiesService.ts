import type { CommercialOpportunity } from "@/contracts";
import { createId } from "@/lib/ids";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export const opportunitiesService = {
  async list() {
    return simulateLatency(readWorkspace().opportunities);
  },
  async create(input: Omit<CommercialOpportunity, "id" | "createdAt" | "activities" | "tasks" | "documents">) {
    const opportunity: CommercialOpportunity = {
      ...input,
      id: createId("opp"),
      createdAt: new Date().toISOString(),
      activities: 0,
      tasks: 0,
      documents: 0,
    };
    writeWorkspace((workspace) => ({
      ...workspace,
      opportunities: [opportunity, ...workspace.opportunities],
      tenders: workspace.tenders.map((item) =>
        item.id === input.tenderId
          ? { ...item, dynamicsOpportunityId: input.dynamicsOpportunityId }
          : item,
      ),
    }));
    return simulateLatency(opportunity);
  },
  async close(id: string, outcome: "ganada" | "perdida") {
    writeWorkspace((workspace) => ({
      ...workspace,
      opportunities: workspace.opportunities.map((item) =>
        item.id === id ? { ...item, status: "cerrada", outcome, stage: outcome } : item,
      ),
    }));
    return simulateLatency(true);
  },
};
