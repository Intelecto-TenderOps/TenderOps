import { describe, expect, it } from "vitest";
import { summarizeMatrix } from "../src/domain/compliance.js";
import { scoreAssessment } from "../src/domain/scoring.js";
import { assertTenant, can } from "../src/domain/permissions.js";

describe("evaluación", () => {
  it("calcula puntaje ponderado", () => {
    const result = scoreAssessment({
      commercial: 80,
      experience: 80,
      financial: 80,
      legal: 80,
      technical: 80,
      geo: 80,
      economic: 80,
      deadlines: 80,
      risks: 80,
    });
    expect(result.score).toBe(80);
    expect(result.recommendation).toBe("BID");
  });
});

describe("matriz", () => {
  it("separa cumplimiento de carga documental", () => {
    const summary = summarizeMatrix([
      { id: "1", processId: "p", category: "jurídico", description: "x", compliance: "cumple", risk: "bajo", status: "abierto", copied: "pendiente", version: 1 },
      { id: "2", processId: "p", category: "técnico", description: "y", compliance: "pendiente", risk: "medio", status: "abierto", copied: "cargado", version: 1 },
    ]);
    expect(summary.compliancePercent).toBe(50);
    expect(summary.preparationPercent).toBe(50);
  });
});

describe("permisos", () => {
  it("impide cruce de empresa", () => {
    expect(() => assertTenant("co-a", "co-b")).toThrow(/empresa/);
    expect(can("Lector", "companies.write")).toBe(false);
  });
});
