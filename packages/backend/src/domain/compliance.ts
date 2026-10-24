export type ComplianceResult = "cumple" | "no_cumple" | "parcial" | "pendiente" | "no_aplica";
export type CopiedState = "pendiente" | "en_proceso" | "listo_no_cargado" | "cargado";

export interface RequirementItem {
  id: string;
  processId: string;
  category: string;
  description: string;
  source?: string;
  document?: string;
  page?: string;
  evidence?: string;
  compliance: ComplianceResult;
  risk: string;
  owner?: string;
  dueDate?: string;
  status: string;
  copied: CopiedState;
  notes?: string;
  version: number;
}

export function summarizeMatrix(items: RequirementItem[]) {
  const total = items.length;
  const evaluated = items.filter((item) => item.compliance !== "pendiente").length;
  const met = items.filter((item) => item.compliance === "cumple").length;
  const pending = items.filter((item) => item.compliance === "pendiente").length;
  const failed = items.filter((item) => item.compliance === "no_cumple").length;
  const prepared = items.filter((item) => item.copied === "cargado" || item.copied === "listo_no_cargado").length;
  const uploaded = items.filter((item) => item.copied === "cargado").length;
  return {
    total,
    evaluated,
    met,
    pending,
    failed,
    prepared,
    uploaded,
    compliancePercent: total ? Math.round((met / total) * 100) : 0,
    preparationPercent: total ? Math.round((uploaded / total) * 100) : 0,
  };
}
