import type { AlertItem } from "@/contracts";
import { apiGet } from "./http";
import { readWorkspace, writeWorkspace } from "./workspace";

export const alertsService = {
  async list(): Promise<{ items: AlertItem[]; source: "live" | "demo"; warnings?: string[] }> {
    try {
      const result = await apiGet<{ items: AlertItem[]; warnings?: string[] }>("/api/v1/secop/signals");
      return { items: result.items, source: "live", warnings: result.warnings };
    } catch {
      return {
        items: readWorkspace().alerts,
        source: "demo",
        warnings: ["API no disponible; se muestran alertas del lote de demostración."],
      };
    }
  },
  async markRead(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      alerts: workspace.alerts.map((item) => (item.id === id ? { ...item, read: true } : item)),
    }));
    return true;
  },
  async toggleSilence(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      alerts: workspace.alerts.map((item) =>
        item.id === id ? { ...item, silenced: !item.silenced } : item,
      ),
    }));
    return true;
  },
};
