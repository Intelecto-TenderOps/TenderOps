import type { AnalyticsSnapshot } from "@/contracts";
import { apiFetch, usesRemoteApi } from "@/lib/api";
import { readWorkspace, simulateLatency } from "./workspace";

export const analyticsService = {
  async snapshot(): Promise<AnalyticsSnapshot> {
    if (usesRemoteApi()) return apiFetch<AnalyticsSnapshot>("/analytics/overview");
    const { tenders, opportunities, tasks, assessments } = readWorkspace();
    const snapshot: AnalyticsSnapshot = {
      detected: tenders.length,
      evaluated: assessments.length,
      recommended: tenders.filter((item) => item.recommendation === "BID").length,
      discarded: tenders.filter((item) => item.recommendation === "NO_BID").length,
      closingSoon: tenders.filter((item) => item.status === "abierto").length,
      inDynamics: opportunities.length,
      overdueTasks: tasks.filter((item) => item.dueDate <= "2026-10-23" && item.status !== "hecha").length,
      winRate: opportunities.length
        ? Math.round(
            (opportunities.filter((item) => item.outcome === "ganada").length / opportunities.length) * 100,
          )
        : 0,
      funnel: [
        { stage: "Detectadas", count: tenders.length },
        { stage: "Evaluadas", count: assessments.length },
        { stage: "Recomendadas", count: tenders.filter((item) => item.recommendation === "BID").length },
        { stage: "En Dynamics", count: opportunities.length },
        { stage: "Ganadas", count: opportunities.filter((item) => item.outcome === "ganada").length },
      ],
      byModality: Object.entries(
        tenders.reduce<Record<string, number>>((acc, item) => {
          acc[item.modality] = (acc[item.modality] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
      byEntity: Object.entries(
        tenders.reduce<Record<string, number>>((acc, item) => {
          acc[item.entity] = (acc[item.entity] ?? 0) + item.value;
          return acc;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
    };
    return simulateLatency(snapshot);
  },
};
