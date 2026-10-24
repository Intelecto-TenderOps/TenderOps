import { createHash } from "node:crypto";
import { query } from "./client.js";
import type { NormalizedProcess, ProcessSearchQuery, ProcessSearchResult } from "../secop/types.js";

export function fingerprint(process: NormalizedProcess) {
  const relevant = [
    process.externalProcessId,
    process.sourceStatus,
    process.sourceOpeningStatus,
    process.phase,
    process.estimatedValue,
    process.closingDate,
    process.title,
    process.modality,
    process.sourceUrl,
  ].join("|");
  return createHash("sha256").update(relevant).digest("hex");
}

export class ProcessRepository {
  async available() {
    const result = await query("select 1 as ok");
    return Boolean(result);
  }

  async upsert(process: NormalizedProcess) {
    const print = fingerprint(process);
    const existing = await query<{ fingerprint: string }>(
      "select fingerprint from secop_processes where source = $1 and external_process_id = $2",
      [process.source, process.externalProcessId],
    );
    if (!existing) return { inserted: false, updated: false, skipped: true };
    await query(
      `insert into secop_processes (
        id, source, external_process_id, process_reference, portfolio_id, entity_name, entity_nit,
        title, subject, phase, source_status, source_opening_status, publication_date,
        last_source_publication_date, closing_date, closing_date_confidence, estimated_value,
        currency, modality, department, municipality, main_category_code, contract_type,
        source_url, computed_status, computed_status_confidence, fingerprint, payload, synced_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28::jsonb,$29
      )
      on conflict (source, external_process_id) do update set
        title = excluded.title, subject = excluded.subject, phase = excluded.phase,
        source_status = excluded.source_status, estimated_value = excluded.estimated_value,
        closing_date = excluded.closing_date, computed_status = excluded.computed_status,
        fingerprint = excluded.fingerprint, payload = excluded.payload, synced_at = excluded.synced_at`,
      [
        process.id, process.source, process.externalProcessId, process.processReference, process.portfolioId,
        process.entityName, process.entityNit, process.title, process.subject, process.phase,
        process.sourceStatus, process.sourceOpeningStatus, process.publicationDate,
        process.lastSourcePublicationDate, process.closingDate, process.closingDateConfidence,
        process.estimatedValue, process.currency, process.modality, process.department,
        process.municipality, process.mainCategoryCode, process.contractType, process.sourceUrl,
        process.computedStatus, process.computedStatusConfidence, print, JSON.stringify(process), process.syncedAt,
      ],
    );
    const changed = existing.rows[0] && existing.rows[0].fingerprint !== print;
    if (changed || !existing.rows[0]) {
      await query(
        "insert into secop_process_versions (process_id, fingerprint, payload) values ($1,$2,$3::jsonb)",
        [process.id, print, JSON.stringify(process)],
      );
    }
    return { inserted: !existing.rows[0], updated: Boolean(changed), skipped: false };
  }

  async search(queryInput: ProcessSearchQuery): Promise<Omit<ProcessSearchResult, "appliedFilters" | "warnings" | "mode">> {
    const offset = Number(queryInput.cursor ?? 0) || 0;
    const limit = Math.min(queryInput.pageSize ?? 25, 50);
    const clauses: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      values.push(value);
      clauses.push(sql.replace("?", `$${values.length}`));
    };
    if (queryInput.source && queryInput.source !== "all") add("source = ?", queryInput.source);
    if (queryInput.entity) add("entity_name ilike ?", `%${queryInput.entity}%`);
    if (queryInput.nit) add("entity_nit = ?", queryInput.nit);
    if (queryInput.department) add("department ilike ?", `%${queryInput.department}%`);
    if (queryInput.q) {
      values.push(queryInput.q);
      clauses.push(`search_text @@ plainto_tsquery('spanish', $${values.length})`);
    }
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const rows = await query<{ payload: NormalizedProcess }>(
      `select payload from secop_processes ${where} order by publication_date desc nulls last, external_process_id asc limit ${limit} offset ${offset}`,
      values,
    );
    const count = await query<{ total: string }>(`select count(*) as total from secop_processes ${where}`, values);
    const items = rows?.rows.map((row) => row.payload) ?? [];
    return {
      items,
      total: Number(count?.rows[0]?.total ?? items.length),
      totalIsApproximate: false,
      cursor: items.length === limit ? String(offset + limit) : null,
      sourceUpdatedAt: null,
      syncedAt: new Date().toISOString(),
    };
  }
}
