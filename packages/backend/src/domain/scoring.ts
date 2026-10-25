export interface CriterionWeight {
  id: string;
  name: string;
  category: string;
  weight: number;
  enabled: boolean;
  blocking?: boolean;
}

export const defaultWeights: CriterionWeight[] = [
  { id: "commercial", name: "Comercial", category: "comercial", weight: 15, enabled: true },
  { id: "experience", name: "Experiencia", category: "experiencia", weight: 20, enabled: true },
  { id: "financial", name: "Financiera", category: "financiera", weight: 15, enabled: true },
  { id: "legal", name: "Jurídica", category: "juridica", weight: 15, enabled: true },
  { id: "technical", name: "Técnica", category: "tecnica", weight: 15, enabled: true },
  { id: "geo", name: "Geográfica", category: "geografica", weight: 5, enabled: true },
  { id: "economic", name: "Económica", category: "economica", weight: 5, enabled: true },
  { id: "deadlines", name: "Plazos", category: "plazos", weight: 5, enabled: true },
  { id: "risks", name: "Riesgos", category: "riesgos", weight: 5, enabled: true },
];

export function scoreAssessment(scores: Record<string, number>, weights = defaultWeights) {
  const active = weights.filter((item) => item.enabled);
  const totalWeight = active.reduce((sum, item) => sum + item.weight, 0) || 1;
  const details = active.map((item) => {
    const value = Math.min(100, Math.max(0, scores[item.id] ?? 0));
    return { ...item, value, weighted: (value * item.weight) / totalWeight };
  });
  const score = Math.round(details.reduce((sum, item) => sum + item.weighted, 0));
  const blocked = details.find((item) => item.blocking && item.value < 40);
  return {
    score,
    risk: score >= 75 ? "bajo" : score >= 50 ? "medio" : score >= 30 ? "alto" : "critico",
    recommendation: blocked ? "NO_BID" : score >= 70 ? "BID" : score >= 45 ? "REVISION" : "NO_BID",
    blocked: Boolean(blocked),
    blockReason: blocked ? `Regla bloqueante: ${blocked.name}` : null,
    confidence: 70,
    details,
    version: 1,
  };
}
