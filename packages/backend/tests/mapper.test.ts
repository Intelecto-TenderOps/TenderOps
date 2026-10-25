import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeStatus, detectExactProcessId, extractUrl, mapSecopII, parseMoney } from "../src/secop/mapper.js";
import { buildQuery, buildWhere } from "../src/secop/soql.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/secop-ii-sample.json", import.meta.url), "utf8")) as Record<string, unknown>[];

describe("normalización SECOP II", () => {
  it("conserva identificadores y URL objeto", () => {
    const mapped = mapSecopII(fixture[0]);
    expect(mapped.externalProcessId).toBe("CO1.REQ.2577563");
    expect(mapped.entityNit).toBe("899999027");
    expect(mapped.sourceUrl).toContain("community.secop.gov.co");
    expect(mapped.estimatedValue).toBe("57333333");
    expect(mapped.closingDate).toBeNull();
    expect(mapped.computedStatus).toBe("por_verificar");
  });

  it("no inventa valores monetarios ni fechas", () => {
    const mapped = mapSecopII(fixture[1]);
    expect(mapped.estimatedValue).toBeNull();
    expect(mapped.closingDateConfidence).toBe("absent");
    expect(mapped.missing.some((item) => item.field === "closingDate")).toBe(true);
  });

  it("no marca vigente un proceso con cierre vencido y apertura abierta", () => {
    const result = computeStatus({
      openingStatus: "Abierto",
      closingDate: "2020-01-01T00:00:00.000",
      sourceStatus: "En curso",
    });
    expect(result.status).toBe("por_verificar");
  });
});

describe("SoQL", () => {
  it("rechaza columnas y operadores no permitidos", () => {
    expect(() => buildWhere("SECOP_II", [{ column: "drop table", operator: "=", value: "1" }])).toThrow(/no permitida/);
    expect(() => buildWhere("SECOP_II", [{ column: "entidad", operator: ";", value: "1" }])).toThrow(/no permitido/);
  });

  it("escapa comillas y agrega desempate", () => {
    const params = buildQuery("SECOP_II", {
      filters: [{ column: "entidad", operator: "=", value: "O'Higgins" }],
      limit: 10,
    });
    expect(params.get("$where")).toContain("'O''Higgins'");
    expect(params.get("$order")).toContain("id_del_proceso ASC");
  });
});

describe("identificadores", () => {
  it("reconoce CO1.REQ", () => {
    expect(detectExactProcessId("CO1.REQ.11180640")).toEqual({ source: "SECOP_II", id: "CO1.REQ.11180640" });
  });
});

describe("URL", () => {
  it("acepta cadena u objeto", () => {
    expect(extractUrl("https://community.secop.gov.co/x")).toContain("secop");
    expect(extractUrl({ url: "https://community.secop.gov.co/x" })).toContain("secop");
  });
});

describe("dinero", () => {
  it("mantiene precisión como texto", () => {
    expect(parseMoney("1500000000")).toBe("1500000000");
    expect(parseMoney("abc")).toBeNull();
  });
});
