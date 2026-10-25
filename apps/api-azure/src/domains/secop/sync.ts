import { querySecop } from "../../clients/secop.js";
import { loadConfig } from "../../shared/config.js";
import { newId } from "../../shared/ids.js";
import type { BusinessStore, SecopChange, SecopSyncRun } from "../../store/types.js";
import { normalizeSecop, relevantChange } from "./normalize.js";

export interface SyncOptions {
  kind: "recent" | "changes" | "monitored" | "saved-searches";
  source?: "SECOP II" | "SECOP I";
  now?: Date;
}

export function isRelevant(storeFlags: {
  watching?: boolean;
  analyzed?: boolean;
  decided?: boolean;
  opportunityId?: string | null;
  hasTasks?: boolean;
  hasDocuments?: boolean;
  savedSearchHit?: boolean;
  approvedCriteria?: boolean;
}): boolean {
  return Boolean(
    storeFlags.watching ||
      storeFlags.analyzed ||
      storeFlags.decided ||
      storeFlags.opportunityId ||
      storeFlags.hasTasks ||
      storeFlags.hasDocuments ||
      storeFlags.savedSearchHit ||
      storeFlags.approvedCriteria,
  );
}

export function shouldRetain(processUpdatedAt: string | null, retentionDays: number, relevant: boolean, now = new Date()): boolean {
  if (relevant) return true;
  if (!processUpdatedAt) return false;
  const age = now.getTime() - Date.parse(processUpdatedAt);
  return age <= retentionDays * 86400000;
}

async function withRetry<T>(work: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      last = error;
      const retryAfter = typeof error === "object" && error && "retryAfter" in error ? Number(error.retryAfter) : attempt;
      await new Promise((resolve) => setTimeout(resolve, Math.min(8000, 250 * 2 ** attempt) + retryAfter * 100));
    }
  }
  throw last;
}

export async function runSecopSync(store: BusinessStore, options: SyncOptions): Promise<SecopSyncRun> {
  const config = loadConfig();
  const now = options.now ?? new Date();
  const run: SecopSyncRun = {
    id: newId(),
    kind: options.kind,
    startedAt: now.toISOString(),
    finishedAt: null,
    status: "running",
    fetched: 0,
    upserted: 0,
    changed: 0,
    skipped: 0,
  };
  const lockOwner = run.id;
  if (!(await store.acquireLock(`sync:${options.kind}`, lockOwner, 8 * 60 * 1000))) {
    run.status = "error";
    run.error = "lock_busy";
    run.finishedAt = new Date().toISOString();
    await store.saveSync(run);
    return run;
  }
  await store.saveSync(run);
  try {
    const last = await store.lastSync(options.kind);
    const cursor = await store.getCursor(`${options.kind}:${options.source ?? "SECOP II"}`);
    const windowStart = new Date(now);
    windowStart.setUTCDate(windowStart.getUTCDate() - config.retentionDays);
    const updatedSince = options.kind === "recent"
      ? windowStart.toISOString()
      : cursor?.watermark ?? last?.finishedAt ?? windowStart.toISOString();
    let offset = cursor?.offset ?? 0;
    let requests = 0;
    let watermark = updatedSince;
    while (requests < config.maxRequestsPerRun && run.upserted < config.catalogMaxPerRun) {
      const raw = await withRetry(() =>
        querySecop({
          source: options.source ?? "SECOP II",
          updatedSince,
          limit: config.syncBatchSize,
          offset,
          order: "fecha_de_ultima_publicaci DESC",
        }),
      );
      requests += 1;
      if (raw.length === 0) break;
      run.fetched += raw.length;
      for (const record of raw) {
        const next = normalizeSecop(record, now.toISOString());
        const existing = await store.findProcess(next.source, next.externalId);
        const changes = relevantChange(existing ?? undefined, next);
        const relevant = existing?.relevant ?? false;
        const merged = { ...next, relevant, provenance: "catalog" as const };
        if (existing && existing.hash === next.hash) {
          run.skipped += 1;
          continue;
        }
        let change: SecopChange | undefined;
        if (existing && changes.length) {
          change = {
            id: newId(),
            processId: next.id,
            fields: changes,
            before: { hash: existing.hash, status: existing.status, value: existing.value, closesAt: existing.closesAt },
            after: { hash: next.hash, status: next.status, value: next.value, closesAt: next.closesAt },
            at: now.toISOString(),
          };
          run.changed += 1;
        }
        await store.upsertProcess(merged, change);
        run.upserted += 1;
        if (next.updatedAt && next.updatedAt > watermark) watermark = next.updatedAt;
      }
      if (raw.length < config.syncBatchSize) break;
      offset += raw.length;
    }
    await store.saveCursor({
      id: `${options.kind}:${options.source ?? "SECOP II"}`,
      source: options.source ?? "SECOP II",
      watermark,
      offset: 0,
      updatedAt: now.toISOString(),
    });
    run.status = "ok";
    run.cursor = watermark;
    run.finishedAt = new Date().toISOString();
  } catch (error) {
    run.status = "error";
    run.error = error instanceof Error ? error.message : "sync_failed";
    run.finishedAt = new Date().toISOString();
  } finally {
    await store.releaseLock(`sync:${options.kind}`, lockOwner);
    await store.saveSync(run);
  }
  return run;
}

export async function cleanupCatalog(store: BusinessStore, now = new Date()): Promise<{ removed: number; kept: number }> {
  const days = loadConfig().retentionDays;
  const processes = await store.listProcesses();
  let removed = 0;
  let kept = 0;
  for (const process of processes) {
    if (shouldRetain(process.updatedAt ?? process.publishedAt, days, process.relevant, now)) {
      kept += 1;
      continue;
    }
    await store.deleteProcess(process.id);
    removed += 1;
  }
  return { removed, kept };
}

export async function evaluateSavedSearches(store: BusinessStore, companyId: string): Promise<number> {
  if (!companyId) return 0;
  const workspace = await store.workspace(companyId);
  const processes = await store.listProcesses();
  let matches = 0;
  for (const search of workspace.searches.filter((item) => item.active)) {
    for (const process of processes) {
      const haystack = `${process.title} ${process.entity} ${process.department}`.toLowerCase();
      const query = search.filters.search?.toLowerCase();
      if (query && !haystack.includes(query)) continue;
      if (search.filters.departments?.length && !search.filters.departments.includes(process.department)) continue;
      if (search.filters.modalities?.length && !search.filters.modalities.includes(process.modality)) continue;
      matches += 1;
      const existing = await store.getCandidate(companyId, process.id);
      await store.saveCandidate({
        id: existing?.id ?? crypto.randomUUID(),
        companyId,
        processId: process.id,
        favorite: existing?.favorite ?? false,
        watching: existing?.watching ?? true,
        owner: existing?.owner ?? "",
        analyzed: existing?.analyzed ?? false,
        decided: existing?.decided ?? false,
        opportunityId: existing?.opportunityId ?? null,
      });
      await store.upsertProcess({ ...process, relevant: true });
    }
  }
  return matches;
}
