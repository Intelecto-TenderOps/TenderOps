import type { CriterionWeight } from "@/contracts";
import { apiPost } from "./http";
import { readWorkspace, writeWorkspace } from "./workspace";

export const assessmentsService = {
  async list() {
    return { items: readWorkspace().assessments, source: "local" as const };
  },
  async getByTender(tenderId: string) {
    return readWorkspace().assessments.find((item) => item.tenderId === tenderId) ?? null;
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
    return true;
  },
  async recalc(tenderId: string) {
    const current = readWorkspace().assessments.find((item) => item.tenderId === tenderId);
    let persistence = { configured: false, message: "Recálculo local." };
    try {
      const result = await apiPost<{
        item: { score: number; risk: string; recommendation: string; blocked: boolean; blockReason: string | null; confidence: number };
        persistence?: { configured?: boolean; message?: string };
      }>("/api/v1/assessments", {
        scores: {
          commercial: current?.compatibility ?? 0,
          experience: current?.experience ?? 0,
          financial: current?.financial ?? 0,
          legal: current?.legal ?? 0,
          technical: current?.technical ?? 0,
        },
      });
      persistence = {
        configured: result.persistence?.configured ?? false,
        message: result.persistence?.message ?? "Motor determinista; Dataverse no persistió.",
      };
      if (current) {
        writeWorkspace((workspace) => ({
          ...workspace,
          assessments: workspace.assessments.map((item) =>
            item.tenderId === tenderId
              ? {
                  ...item,
                  score: result.item.score,
                  risk: result.item.risk as typeof item.risk,
                  recommendation: result.item.recommendation as typeof item.recommendation,
                  blocked: result.item.blocked,
                  blockReason: result.item.blockReason,
                  confidence: result.item.confidence,
                  version: item.version + 1,
                  updatedAt: new Date().toISOString(),
                  explanation: persistence.configured
                    ? item.explanation
                    : `${item.explanation} Recálculo determinista sin persistencia Dataverse.`,
                }
              : item,
          ),
        }));
      }
      return { ok: true as const, persistence };
    } catch {
      writeWorkspace((workspace) => ({
        ...workspace,
        assessments: workspace.assessments.map((item) =>
          item.tenderId === tenderId
            ? { ...item, version: item.version + 1, updatedAt: new Date().toISOString() }
            : item,
        ),
      }));
      return { ok: true as const, persistence };
    }
  },
};
