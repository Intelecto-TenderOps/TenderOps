import type { AnalyticsSnapshot } from "@/contracts";
import { apiGet } from "./http";
import { listLiveTenders } from "./tendersService";
import { readWorkspace } from "./workspace";

function demoSnapshot(): AnalyticsSnapshot {
  const { tenders, tasks, assessments } = readWorkspace();
  return {
    detected: tenders.length,
    evaluated: assessments.length,
    recommended: tenders.filter((item) => item.recommendation === "BID").length,
    discarded: tenders.filter((item) => item.recommendation === "NO_BID").length,
    closingSoon: tenders.filter((item) => item.status === "abierto").length,
    inDynamics: 0,
    overdueTasks: tasks.filter((item) => item.dueDate <= "2026-10-23" && item.status !== "hecha").length,
    winRate: 0,
    funnel: [
      { stage: "Detectadas", count: tenders.length },
      { stage: "Evaluadas", count: assessments.length },
      { stage: "Recomendadas", count: tenders.filter((item) => item.recommendation === "BID").length },
      { stage: "En Dynamics", count: 0 },
      { stage: "Ganadas", count: 0 },
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
    source: "demo",
    notes: [
      "API no disponible. Los conteos de exploración son del lote local.",
      "No se afirma éxito de Dynamics, Dataverse ni Copilot.",
    ],
    integrations: { dynamics: false, dataverse: false, copilot: false },
  };
}

export const analyticsService = {
  async snapshot(): Promise<AnalyticsSnapshot> {
    try {
      const live = await apiGet<AnalyticsSnapshot>("/api/v1/analytics");
      if (!live.detected) {
        const search = await listLiveTenders({});
        return {
          ...live,
          detected: search.total ?? search.items.length,
          funnel: live.funnel?.length
            ? live.funnel.map((item) =>
                item.stage === "Detectadas" ? { ...item, count: search.total ?? search.items.length } : item,
              )
            : live.funnel,
          source: "live",
        };
      }
      return { ...live, source: "live" };
    } catch {
      return demoSnapshot();
    }
  },
};
