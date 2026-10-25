import type { Assessment, CriterionWeight } from "@/contracts";
import { apiFetch, usesRemoteApi } from "@/lib/api";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export const assessmentsService = {
  async list() {
    if (usesRemoteApi()) return apiFetch<Assessment[]>("/assessments");
    return simulateLatency(readWorkspace().assessments);
  },
  async getByTender(tenderId: string) {
    return simulateLatency(
      readWorkspace().assessments.find((item) => item.tenderId === tenderId) ?? null,
    );
  },
  async saveWeights(weights: CriterionWeight[]) {
    writeWorkspace((workspace) => ({ ...workspace, criterionWeights: weights }));
    writeWorkspace((workspace) => ({
      ...workspace,
      assessments: workspace.assessments.map((item) => {
        const enabled = weights.filter((weight) => weight.enabled);
        const total = enabled.reduce((sum, weight) => sum + weight.weight, 0) || 1;
        const score = Math.round(
          enabled.reduce((sum, weight) => {
            const map: Record<string, number> = {
              "cw-fit": item.compatibility,
              "cw-exp": item.experience,
              "cw-fin": item.financial,
              "cw-leg": item.legal,
              "cw-tec": item.technical,
              "cw-score": item.scoring,
            };
            return sum + ((map[weight.id] ?? item.score) * weight.weight) / total;
          }, 0),
        );
        return { ...item, score, version: item.version + 1 };
      }),
    }));
    return simulateLatency(true);
  },
  async recalc(tenderId: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      assessments: workspace.assessments.map((item) =>
        item.tenderId === tenderId
          ? { ...item, version: item.version + 1, updatedAt: new Date().toISOString() }
          : item,
      ),
    }));
    return simulateLatency(true);
  },
};
