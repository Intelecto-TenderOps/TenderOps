import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { NormalizedProcess } from "./types.js";

export interface SyncRun {
  id: string;
  source: string;
  startedAt: string;
  finishedAt: string;
  fetched: number;
  inserted: number;
  updated: number;
  discarded: number;
  sourceUpdatedAt: string | null;
}

interface CatalogState {
  processes: Record<string, NormalizedProcess>;
  runs: SyncRun[];
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
}

function resolveCatalogPath() {
  if (process.env.SECOP_CATALOG_PATH) return process.env.SECOP_CATALOG_PATH;
  if (process.env.VERCEL) return "/tmp/secop-catalog.json";
  return ".local/secop-catalog.json";
}

function empty(): CatalogState {
  return { processes: {}, runs: [], lastSuccessAt: null, lastAttemptAt: null, lastError: null };
}

let state: CatalogState = empty();
let hydrated = false;

export function catalogPath() {
  return resolveCatalogPath();
}

export function hydrateCatalog() {
  if (hydrated) return;
  hydrated = true;
  try {
    const file = resolveCatalogPath();
    if (!existsSync(file)) return;
    const parsed = JSON.parse(readFileSync(file, "utf8")) as CatalogState;
    state = {
      processes: parsed.processes ?? {},
      runs: parsed.runs ?? [],
      lastSuccessAt: parsed.lastSuccessAt ?? null,
      lastAttemptAt: parsed.lastAttemptAt ?? null,
      lastError: parsed.lastError ?? null,
    };
  } catch {
    state = empty();
  }
}

function persist() {
  try {
    const file = resolveCatalogPath();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(state));
  } catch {
    // El catálogo en memoria sigue sirviendo si el disco no está disponible (Vercel).
  }
}

export function upsertCatalog(process: NormalizedProcess) {
  hydrateCatalog();
  const previous = state.processes[process.id];
  state.processes[process.id] = process;
  if (!previous) return "inserted" as const;
  if (previous.sourceUpdatedAt !== process.sourceUpdatedAt || previous.title !== process.title || previous.sourceStatus !== process.sourceStatus) {
    return "updated" as const;
  }
  return "unchanged" as const;
}

export function listCatalog(): NormalizedProcess[] {
  hydrateCatalog();
  return Object.values(state.processes);
}

export function catalogSize() {
  hydrateCatalog();
  return Object.keys(state.processes).length;
}

export function recordRun(run: SyncRun, error?: string) {
  hydrateCatalog();
  state.lastAttemptAt = run.finishedAt;
  if (error) state.lastError = error;
  else {
    state.lastSuccessAt = run.finishedAt;
    state.lastError = null;
  }
  state.runs = [run, ...state.runs].slice(0, 40);
  persist();
}

export function resetCatalog() {
  state = empty();
  hydrated = true;
}

export function catalogStatus() {
  hydrateCatalog();
  return {
    size: catalogSize(),
    lastSuccessAt: state.lastSuccessAt,
    lastAttemptAt: state.lastAttemptAt,
    lastError: state.lastError,
    runs: state.runs.slice(0, 10),
  };
}

export function filterCatalog(query: {
  q?: string;
  source?: string;
  entity?: string;
  department?: string;
  modality?: string;
}): NormalizedProcess[] {
  const items = listCatalog();
  const hay = (value: string | null | undefined) => (value ?? "").toLowerCase();
  const term = query.q?.toLowerCase().trim();
  return items.filter((item) => {
    if (query.source && query.source !== "all" && item.source !== query.source) return false;
    if (query.entity && !hay(item.entityName).includes(query.entity.toLowerCase())) return false;
    if (query.department && !hay(item.department).includes(query.department.toLowerCase())) return false;
    if (query.modality && !hay(item.modality).includes(query.modality.toLowerCase())) return false;
    if (term) {
      const blob = `${item.title} ${item.subject} ${item.entityName} ${item.externalProcessId} ${item.processReference}`;
      if (!hay(blob).includes(term)) return false;
    }
    return true;
  });
}
