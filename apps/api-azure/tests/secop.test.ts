import { beforeEach, describe, expect, it } from "vitest";
import { normalizeSecop, processMatchesFilters, relevantChange } from "../src/domains/secop/normalize.js";
import { shouldRetain, isRelevant } from "../src/domains/secop/sync.js";
import { fetchSecopMetadata, querySecop, SECOP_II_FIELDS, validateKnownFields } from "../src/clients/secop.js";
import { setupTestEnv } from "./helpers.js";

beforeEach(() => {
  setupTestEnv();
});

describe("SECOP normalization and retention", () => {
  it("normalizes official SECOP II field names", () => {
    const process = normalizeSecop({
      source: "SECOP II",
      dataset: "p6dx-8zbt",
      fields: {
        [SECOP_II_FIELDS.id]: "PROC-1",
        [SECOP_II_FIELDS.title]: "Plataforma ciudadana",
        [SECOP_II_FIELDS.entity]: "Alcaldía de Bogotá",
        [SECOP_II_FIELDS.taxId]: "899999061",
        [SECOP_II_FIELDS.department]: "Bogotá D.C.",
        [SECOP_II_FIELDS.municipality]: "Bogotá",
        [SECOP_II_FIELDS.modality]: "Licitación pública",
        [SECOP_II_FIELDS.status]: "Presentación de ofertas",
        [SECOP_II_FIELDS.value]: "150000000",
        [SECOP_II_FIELDS.publishedAt]: "2026-10-20T00:00:00.000",
        [SECOP_II_FIELDS.updatedAt]: "2026-10-21T00:00:00.000",
        [SECOP_II_FIELDS.url]: { url: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=PROC-1" },
      },
    });
    expect(process.externalId).toBe("PROC-1");
    expect(process.entity).toBe("Alcaldía de Bogotá");
    expect(process.value).toBe(150000000);
    expect(process.sourceUrl).toContain("secop.gov.co");
    expect(process.provenance).toBe("secop");
  });

  it("detects relevant field changes only", () => {
    const first = normalizeSecop({
      source: "SECOP II",
      dataset: "p6dx-8zbt",
      fields: { [SECOP_II_FIELDS.id]: "A", [SECOP_II_FIELDS.title]: "Uno", [SECOP_II_FIELDS.status]: "Abierto", [SECOP_II_FIELDS.value]: "10" },
    });
    const second = normalizeSecop({
      source: "SECOP II",
      dataset: "p6dx-8zbt",
      fields: { [SECOP_II_FIELDS.id]: "A", [SECOP_II_FIELDS.title]: "Uno", [SECOP_II_FIELDS.status]: "Adjudicado", [SECOP_II_FIELDS.value]: "10" },
    });
    expect(relevantChange(first, { ...first, hash: first.hash })).toEqual([]);
    expect(relevantChange(first, second)).toContain("status");
  });

  it("keeps relevant processes outside the 90-day window", () => {
    const old = new Date("2025-01-01T00:00:00Z").toISOString();
    expect(shouldRetain(old, 90, false, new Date("2026-10-25T00:00:00Z"))).toBe(false);
    expect(shouldRetain(old, 90, true, new Date("2026-10-25T00:00:00Z"))).toBe(true);
    expect(isRelevant({ watching: true })).toBe(true);
    expect(isRelevant({})).toBe(false);
  });

  it("matches catalog filters used by hybrid search", () => {
    const process = normalizeSecop({
      source: "SECOP II",
      dataset: "p6dx-8zbt",
      fields: {
        [SECOP_II_FIELDS.id]: "X",
        [SECOP_II_FIELDS.title]: "Ciberseguridad",
        [SECOP_II_FIELDS.entity]: "MinTIC",
        [SECOP_II_FIELDS.department]: "Bogotá D.C.",
        [SECOP_II_FIELDS.value]: "200",
      },
    });
    expect(processMatchesFilters(process, { search: "ciber", department: "bogotá" })).toBe(true);
    expect(processMatchesFilters(process, { search: "salud" })).toBe(false);
  });
});

describe("SECOP public API", () => {
  it("validates official metadata field names", async () => {
    const fields = await fetchSecopMetadata("p6dx-8zbt");
    const missing = validateKnownFields("SECOP II", fields);
    expect(missing).toEqual([]);
  });

  it("queries a live SECOP II page when the network allows it", async () => {
    const rows = await querySecop({ source: "SECOP II", limit: 1, search: "licitacion" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.source).toBe("SECOP II");
    expect(rows[0]?.fields).toHaveProperty(SECOP_II_FIELDS.id);
  });
});
