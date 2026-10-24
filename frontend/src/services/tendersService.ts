import type { FilterChip, SavedSearch, Tender, TenderFilters } from "@/contracts";
import { createId } from "@/lib/ids";
import { apiGet } from "./http";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export function chipsToFilters(chips: FilterChip[]): TenderFilters {
  const filters: TenderFilters = {};
  for (const chip of chips) {
    if (chip.field === "search") filters.search = chip.value;
    if (chip.field === "modality") filters.modalities = [...(filters.modalities ?? []), chip.value];
    if (chip.field === "department") filters.departments = [...(filters.departments ?? []), chip.value];
    if (chip.field === "status") filters.statuses = [...(filters.statuses ?? []), chip.value as Tender["status"]];
    if (chip.field === "owner") filters.owners = [...(filters.owners ?? []), chip.value];
    if (chip.field === "value" && chip.value.includes("100")) filters.minValue = 100_000_000;
  }
  return filters;
}

export function filterTenders(items: Tender[], filters: TenderFilters): Tender[] {
  return items.filter((item) => {
    if (filters.search) {
      const haystack = `${item.object} ${item.entity} ${item.secopId}`.toLowerCase();
      if (!haystack.includes(filters.search.toLowerCase())) return false;
    }
    if (filters.modalities?.length && !filters.modalities.includes(item.modality)) return false;
    if (filters.departments?.length && !filters.departments.includes(item.department)) return false;
    if (filters.statuses?.length && !filters.statuses.includes(item.status)) return false;
    if (filters.owners?.length && !filters.owners.includes(item.owner)) return false;
    if (filters.minValue && item.value < filters.minValue) return false;
    if (filters.onlyFavorites && !item.favorite) return false;
    if (filters.onlyWatching && !item.watching) return false;
    return true;
  });
}

export async function listLiveTenders(filters: TenderFilters = {}) {
  const result = await apiGet<{
    items: Tender[];
    total: number | null;
    appliedFilters: FilterChip[];
    warnings: string[];
    sourceUpdatedAt: string | null;
    mode: string;
  }>("/api/v1/secop/processes", {
    q: filters.search,
    modality: filters.modalities?.[0],
    department: filters.departments?.[0],
    status: filters.statuses?.[0],
    minValue: filters.minValue ? String(filters.minValue) : undefined,
  });
  return { ...result, simulated: false as const };
}

export const tendersService = {
  async list(filters: TenderFilters = {}) {
    try {
      return await listLiveTenders(filters);
    } catch {
      const items = filterTenders(readWorkspace().tenders, filters);
      return simulateLatency({ items, total: items.length, simulated: true as const, warnings: ["API SECOP no disponible; se muestra el lote de demostración."] });
    }
  },
  async get(id: string) {
    try {
      const result = await apiGet<{ tender: Tender }>(`/api/v1/secop/processes/${encodeURIComponent(id)}`);
      return { ...result.tender, simulated: false as const };
    } catch {
      const tender = readWorkspace().tenders.find((item) => item.id === id || item.secopId === id);
      return tender ? { ...tender, simulated: true as const } : null;
    }
  },
  async toggleFavorite(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      tenders: workspace.tenders.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite } : item,
      ),
    }));
    return simulateLatency(true);
  },
  async toggleWatch(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      tenders: workspace.tenders.map((item) =>
        item.id === id ? { ...item, watching: !item.watching } : item,
      ),
    }));
    return simulateLatency(true);
  },
  async saveSearch(name: string, filters: TenderFilters) {
    const search: SavedSearch = {
      id: createId("ss"),
      name,
      filters,
      createdAt: new Date().toISOString(),
    };
    writeWorkspace((workspace) => ({
      ...workspace,
      savedSearches: [search, ...workspace.savedSearches],
    }));
    return simulateLatency(search);
  },
};
