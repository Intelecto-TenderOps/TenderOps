import { loadEnv } from "../config/env.js";
import { ProcessRepository } from "../db/repos.js";
import { catalogStatus, recordRun, upsertCatalog } from "./catalog.js";
import { mapSecopI, mapSecopII } from "./mapper.js";
import { SocrataClient } from "./socrata.js";
import type { NormalizedProcess, SecopSource } from "./types.js";

export async function syncSource(source: SecopSource, options?: { publishedFrom?: string; limit?: number }) {
  return syncRecent(source, options);
}

export async function syncRecent(source: SecopSource, options?: { publishedFrom?: string; limit?: number }) {
  const env = loadEnv();
  const client = new SocrataClient();
  const repo = new ProcessRepository();
  const dataset = source === "SECOP_II" ? env.SECOP_II_DATASET_ID : env.SECOP_I_DATASET_ID;
  const pageSize = Math.min(options?.limit ?? env.SECOP_SYNC_BATCH_SIZE, 100);
  const pages = env.SECOP_SYNC_PAGES;
  const lookback = options?.publishedFrom ?? hoursAgo(env.SECOP_LOOKBACK_HOURS);
  const dateColumn = source === "SECOP_II" ? "fecha_de_ultima_publicaci" : "fecha_de_cargue_en_el_secop";
  const startedAt = new Date().toISOString();
  const available = await repo.available();
  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  let discarded = 0;
  let sourceUpdatedAt: string | null = null;

  try {
    for (let page = 0; page < pages; page += 1) {
      const result = await client.query<Record<string, unknown>>(dataset, source, {
        filters: [{ column: dateColumn, operator: ">=", value: lookback }],
        limit: pageSize,
        offset: page * pageSize,
        order: [{ column: dateColumn, direction: "DESC" }],
      });
      sourceUpdatedAt = result.lastModified;
      if (!result.rows.length) break;
      fetched += result.rows.length;
      for (const row of result.rows) {
        try {
          const mapped = source === "SECOP_II" ? mapSecopII(row) : mapSecopI(row);
          const outcome = await persistProcess(mapped, available, repo);
          if (outcome === "inserted") inserted += 1;
          else if (outcome === "updated") updated += 1;
        } catch {
          discarded += 1;
        }
      }
      if (result.rows.length < pageSize) break;
    }

    const run = {
      id: `sync_${source}_${Date.now()}`,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      fetched,
      inserted,
      updated,
      discarded,
      sourceUpdatedAt,
    };
    recordRun(run);
    return {
      runId: run.id,
      status: "finished" as const,
      source,
      fetched,
      inserted,
      updated,
      discarded,
      persisted: true,
      sourceUpdatedAt,
      catalog: catalogStatus(),
      tokenConfigured: Boolean(env.SOCRATA_APP_TOKEN),
      note: `Ventana ${lookback} · ${pages} páginas · ${pageSize} por página.`,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    recordRun(
      {
        id: `sync_${source}_${Date.now()}`,
        source,
        startedAt,
        finishedAt,
        fetched,
        inserted,
        updated,
        discarded,
        sourceUpdatedAt,
      },
      error instanceof Error ? error.message : "Error de sincronización",
    );
    throw error;
  }
}

async function persistProcess(process: NormalizedProcess, postgres: boolean, repo: ProcessRepository) {
  const catalogOutcome = upsertCatalog(process);
  if (postgres) {
    const outcome = await repo.upsert(process);
    if (outcome.inserted) return "inserted";
    if (outcome.updated) return "updated";
  }
  return catalogOutcome;
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000).toISOString().slice(0, 19);
}
