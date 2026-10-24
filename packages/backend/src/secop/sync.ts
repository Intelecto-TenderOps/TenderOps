import { loadEnv } from "../config/env.js";
import { ProcessRepository } from "../db/repos.js";
import { mapSecopI, mapSecopII } from "./mapper.js";
import { SocrataClient } from "./socrata.js";
import type { SecopSource } from "./types.js";

export async function syncSource(source: SecopSource, options?: { publishedFrom?: string; limit?: number }) {
  const env = loadEnv();
  const client = new SocrataClient();
  const repo = new ProcessRepository();
  const dataset = source === "SECOP_II" ? env.SECOP_II_DATASET_ID : env.SECOP_I_DATASET_ID;
  const limit = Math.min(options?.limit ?? env.SECOP_SYNC_BATCH_SIZE, 200);
  const result = await client.query<Record<string, unknown>>(dataset, source, {
    filters: options?.publishedFrom
      ? [{ column: source === "SECOP_II" ? "fecha_de_ultima_publicaci" : "fecha_de_cargue_en_el_secop", operator: ">=", value: options.publishedFrom }]
      : undefined,
    limit,
    offset: 0,
  });
  let inserted = 0;
  let updated = 0;
  let discarded = 0;
  const available = await repo.available();
  for (const row of result.rows) {
    try {
      const mapped = source === "SECOP_II" ? mapSecopII(row) : mapSecopI(row);
      if (available) {
        const outcome = await repo.upsert(mapped);
        if (outcome.inserted) inserted += 1;
        else if (outcome.updated) updated += 1;
      }
    } catch {
      discarded += 1;
    }
  }
  return {
    runId: `sync_${source}_${Date.now()}`,
    status: "finished" as const,
    source,
    fetched: result.rows.length,
    inserted,
    updated,
    discarded,
    persisted: available,
    sourceUpdatedAt: result.lastModified,
    note: available
      ? "Lote limitado persistido. La carga histórica masiva no se dispara automáticamente."
      : "Lote leído desde Socrata. Sin DATABASE_URL no se persiste el índice.",
  };
}
