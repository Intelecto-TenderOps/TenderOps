import type { Requirement } from "@/contracts";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export function matrixProgress(items: Requirement[]): {
  cumple: number;
  pendiente: number;
  noCumple: number;
  copiedReady: number;
} {
  const total = items.length || 1;
  return {
    cumple: Math.round((items.filter((item) => item.compliance === "cumple").length / total) * 100),
    pendiente: Math.round((items.filter((item) => item.compliance === "pendiente").length / total) * 100),
    noCumple: Math.round((items.filter((item) => item.compliance === "no_cumple").length / total) * 100),
    copiedReady: Math.round((items.filter((item) => item.copied === "cargado").length / total) * 100),
  };
}

export const complianceService = {
  async list(tenderId: string) {
    return simulateLatency(readWorkspace().requirements.filter((item) => item.tenderId === tenderId));
  },
  async update(id: string, patch: Partial<Requirement>) {
    writeWorkspace((workspace) => ({
      ...workspace,
      requirements: workspace.requirements.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
    return simulateLatency(true);
  },
};
