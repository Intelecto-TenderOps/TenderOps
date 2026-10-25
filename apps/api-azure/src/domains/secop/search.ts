import { querySecop, type SecopQuery } from "../../clients/secop.js";
import { loadConfig } from "../../shared/config.js";
import type { PagedResult } from "../../shared/types.js";
import type { BusinessStore } from "../../store/types.js";
import { normalizeSecop, processMatchesFilters, toTender, type CatalogProcess } from "./normalize.js";
import type { Tender, TenderFilters } from "../../contracts/workspace.js";

const CATALOG_FRESH_MS = 60 * 60 * 1000;

export interface HybridSearchResult extends PagedResult<Tender> {
  source: "catalog" | "secop" | "hybrid";
  catalogHits: number;
  liveHits: number;
  fetchedAt: string;
}

function catalogCovers(filters: TenderFilters, catalog: CatalogProcess[]): boolean {
  if (filters.exactId) return catalog.some((item) => item.externalId === filters.exactId || item.id === filters.exactId);
  if (filters.from && Date.parse(filters.from) < Date.now() - (loadConfig().retentionDays + 1) * 86400000) return false;
  return catalog.length > 0;
}

function toQuery(filters: TenderFilters, page: number, pageSize: number): SecopQuery {
  return {
    exactId: filters.exactId ?? filters.search,
    search: filters.exactId ? undefined : filters.search,
    entity: filters.entity,
    taxId: filters.taxId,
    modality: filters.modalities?.[0],
    department: filters.departments?.[0],
    municipality: filters.municipality,
    status: filters.statuses?.[0],
    phase: filters.phase,
    minValue: filters.minValue,
    maxValue: filters.maxValue,
    from: filters.from,
    until: filters.until,
    unspsc: filters.unspsc,
    source: filters.source === "SECOP I" || filters.source === "SECOP II" ? filters.source : "SECOP II",
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export async function hybridSearch(
  store: BusinessStore,
  filters: TenderFilters,
  page = 1,
  pageSize = 25,
  signal?: AbortSignal,
): Promise<HybridSearchResult> {
  const fetchedAt = new Date().toISOString();
  const catalog = (await store.listProcesses()).filter((item) => processMatchesFilters(item, {
    search: filters.search,
    entity: filters.entity,
    taxId: filters.taxId,
    modality: filters.modalities?.[0],
    department: filters.departments?.[0],
    municipality: filters.municipality,
    status: filters.statuses?.[0],
    phase: filters.phase,
    minValue: filters.minValue,
    maxValue: filters.maxValue,
    from: filters.from,
    until: filters.until,
    unspsc: filters.unspsc,
    exactId: filters.exactId,
  }));
  const freshCatalog = catalog.filter((item) => Date.now() - Date.parse(item.lastSyncedAt) < CATALOG_FRESH_MS);
  const covered = catalogCovers(filters, freshCatalog);
  let live: CatalogProcess[] = [];
  let source: HybridSearchResult["source"] = "catalog";
  if (!covered) {
    const raw = await querySecop(toQuery(filters, page, pageSize), signal);
    live = raw.map((record) => normalizeSecop(record, fetchedAt));
    source = freshCatalog.length ? "hybrid" : "secop";
  }
  const merged = new Map<string, CatalogProcess>();
  for (const item of freshCatalog) merged.set(item.id, { ...item, provenance: "catalog" });
  for (const item of live) {
    const existing = merged.get(item.id);
    merged.set(item.id, existing ? { ...item, provenance: "hybrid" as never, relevant: existing.relevant } : item);
  }
  const items = [...merged.values()].map((process) => toTender({ ...process, provenance: process.provenance }));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
    source,
    catalogHits: freshCatalog.length,
    liveHits: live.length,
    fetchedAt,
    simulated: false,
  };
}
