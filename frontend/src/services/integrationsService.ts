import type { IntegrationStatus } from "@/contracts";
import type { LiveDependency, SecopStatus } from "@/lib/integration";
import { mapDependency } from "@/lib/integration";
import { apiGet } from "./http";
import { readWorkspace, simulateLatency } from "./workspace";

export const integrationsService = {
  async list(): Promise<{ items: IntegrationStatus[]; source: "live" | "demo" }> {
    try {
      const result = await apiGet<{ items: LiveDependency[] }>("/api/v1/admin/integrations");
      return { items: result.items.map(mapDependency), source: "live" };
    } catch {
      return simulateLatency({
        items: readWorkspace().integrations.map((item) => ({
          ...item,
          status: item.system === "SECOP" ? item.status : "desconectada",
          note: item.system === "SECOP" ? item.note : "API no disponible; no se afirma conexión Microsoft.",
          configured: false,
        })),
        source: "demo" as const,
      });
    }
  },
  async secopStatus(): Promise<SecopStatus> {
    return apiGet<SecopStatus>("/api/v1/secop/status");
  },
  async sources() {
    return apiGet<{ items: { id: string; dataset: string; searchMode: string }[] }>("/api/v1/secop/sources");
  },
  async agents() {
    return apiGet<{ items: { id: string; name: string; configured: boolean }[] }>("/api/v1/agents");
  },
};
