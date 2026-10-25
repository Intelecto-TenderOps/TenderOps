import type { FilterChip, SavedSearch, Tender, TenderFilters } from "@/contracts";
import { apiFetch, usesRemoteApi } from "@/lib/api";
import { createId } from "@/lib/ids";
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

export const tendersService = {
  async list(filters: TenderFilters = {}) {
    if (usesRemoteApi()) {
      const query = new URLSearchParams();
      if (filters.search) query.set("search", filters.search);
      const remote = await apiFetch<{ items: Tender[]; total: number; simulated?: boolean }>(
        `/secop/processes?${query.toString()}`,
      );
      writeWorkspace((workspace) => ({ ...workspace, tenders: remote.items }));
      return { items: filterTenders(remote.items, filters), total: remote.total, simulated: false };
    }
    const items = filterTenders(readWorkspace().tenders, filters);
    return simulateLatency({ items, total: items.length, simulated: true });
  },
  async get(id: string) {
    if (usesRemoteApi()) return apiFetch<Tender | null>(`/secop/processes/${id}`);
    const tender = readWorkspace().tenders.find((item) => item.id === id || item.secopId === id);
    return simulateLatency(tender ?? null);
  },
  async toggleFavorite(id: string) {
    if (usesRemoteApi()) await apiFetch(`/secop/processes/${id}/favorite`, { method: "POST" });
    writeWorkspace((workspace) => ({
      ...workspace,
      tenders: workspace.tenders.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite } : item,
      ),
    }));
    return simulateLatency(true);
  },
  async toggleWatch(id: string) {
    if (usesRemoteApi()) await apiFetch(`/secop/processes/${id}/watch`, { method: "POST" });
    writeWorkspace((workspace) => ({
      ...workspace,
      tenders: workspace.tenders.map((item) =>
        item.id === id ? { ...item, watching: !item.watching } : item,
      ),
    }));
    return simulateLatency(true);
  },
  async saveSearch(name: string, filters: TenderFilters) {
    if (usesRemoteApi()) return apiFetch<SavedSearch>("/secop/searches", { method: "POST", body: JSON.stringify({ name, filters }) });
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
