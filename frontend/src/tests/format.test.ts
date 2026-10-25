import { describe, expect, it } from "vitest";
import { formatDateTime, formatLongDate } from "@/lib/format";

describe("fechas SECOP", () => {
  it("no lanza con cierre vacío o inválido", () => {
    expect(formatDateTime("")).toBe("Sin fecha");
    expect(formatDateTime("no-es-fecha")).toBe("Sin fecha");
    expect(formatLongDate("")).toBe("Sin fecha");
    expect(formatDateTime("2026-10-23T00:00:00.000")).toContain("2026");
  });
});
