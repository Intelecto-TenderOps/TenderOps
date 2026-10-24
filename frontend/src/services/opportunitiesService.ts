import type { CommercialOpportunity } from "@/contracts";
import { apiPost, isIntegrationUnconfigured, readIntegrationError } from "./http";
import { readWorkspace, simulateLatency } from "./workspace";

export const opportunitiesService = {
  async list() {
    return simulateLatency({ items: readWorkspace().opportunities, source: "demo" as const });
  },
  async create(input: {
    tenderId: string;
    name: string;
    value: number;
    secopId?: string;
    account?: string;
  }) {
    try {
      const result = await apiPost<unknown>("/api/v1/opportunities/from-tender", {
        name: input.name,
        secopId: input.secopId,
        value: input.value,
      });
      return { ok: true as const, item: result };
    } catch (error) {
      return {
        ok: false as const,
        unconfigured: isIntegrationUnconfigured(error),
        ...readIntegrationError(error),
      };
    }
  },
  async close(id: string, outcome: "ganada" | "perdida") {
    try {
      await apiPost(`/api/v1/opportunities/${encodeURIComponent(id)}/close`, { outcome });
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        unconfigured: isIntegrationUnconfigured(error),
        ...readIntegrationError(error),
      };
    }
  },
};
