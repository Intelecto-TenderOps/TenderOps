import { describe, expect, it } from "vitest";
import { catalogStatus, filterCatalog, resetCatalog, upsertCatalog } from "../src/secop/catalog.js";
import type { NormalizedProcess } from "../src/secop/types.js";

function process(partial: Partial<NormalizedProcess> & Pick<NormalizedProcess, "id" | "title" | "entityName">): NormalizedProcess {
  return {
    source: "SECOP_II",
    externalProcessId: partial.id.replace("secop:secop_ii:", ""),
    processReference: null,
    portfolioId: null,
    entityNit: null,
    subject: null,
    phase: null,
    sourceStatus: "En curso",
    sourceOpeningStatus: "Abierto",
    publicationDate: "2026-10-24T10:00:00",
    lastSourcePublicationDate: "2026-10-24T12:00:00",
    closingDate: null,
    closingDateConfidence: "absent",
    estimatedValue: "1000",
    currency: "COP",
    modality: "Licitación pública",
    department: "Bogotá",
    municipality: "Bogotá",
    mainCategoryCode: null,
    contractType: null,
    sourceUrl: null,
    computedStatus: "por_verificar",
    computedStatusConfidence: "medium",
    computedStatusReason: "prueba",
    syncedAt: "2026-10-24T12:00:00.000Z",
    sourceUpdatedAt: "2026-10-24T12:00:00.000Z",
    missing: [],
    raw: {},
    ...partial,
  };
}

describe("catálogo SECOP", () => {
  it("inserta, actualiza y filtra sin perder el proceso previo", () => {
    resetCatalog();
    expect(upsertCatalog(process({ id: "secop:secop_ii:A", title: "Software hospitalario", entityName: "Minsalud" }))).toBe("inserted");
    expect(upsertCatalog(process({ id: "secop:secop_ii:A", title: "Software hospitalario v2", entityName: "Minsalud" }))).toBe("updated");
    expect(upsertCatalog(process({ id: "secop:secop_ii:B", title: "Obras viales", entityName: "INVIAS", source: "SECOP_I" }))).toBe("inserted");
    expect(filterCatalog({ q: "software" }).map((item) => item.id)).toEqual(["secop:secop_ii:A"]);
    expect(filterCatalog({ source: "SECOP_I" })).toHaveLength(1);
    expect(catalogStatus().size).toBe(2);
  });
});
