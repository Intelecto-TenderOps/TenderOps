import { describe, expect, it } from "vitest";
import { matrixProgress } from "@/services/complianceService";
import { createSeed } from "@/mocks/seed";

describe("matriz de cumplimiento", () => {
  it("recalcula indicadores locales", () => {
    const rows = createSeed().requirements.filter((item) => item.tenderId === "tnd-001");
    const first = matrixProgress(rows);
    expect(first.cumple).toBeGreaterThanOrEqual(0);
    const updated = rows.map((item, index) =>
      index === 0 ? { ...item, compliance: "cumple" as const, copied: "cargado" as const } : item,
    );
    const second = matrixProgress(updated);
    expect(second.copiedReady).toBeGreaterThanOrEqual(first.copiedReady);
  });
});
