import { SECOP_I_FIELDS, SECOP_II_FIELDS, type SecopRawRecord } from "../../clients/secop.js";
import { sha256, stableId } from "../../shared/ids.js";
import type { Recommendation, RiskLevel, Tender, TenderStatus } from "../../contracts/workspace.js";

export interface CatalogProcess {
  id: string;
  source: "SECOP II" | "SECOP I";
  externalId: string;
  reference: string;
  title: string;
  description: string;
  entity: string;
  entityTaxId: string;
  department: string;
  municipality: string;
  modality: string;
  status: TenderStatus;
  phase: string;
  value: number;
  currency: "COP";
  publishedAt: string | null;
  updatedAt: string | null;
  closesAt: string | null;
  unspsc: string;
  sourceUrl: string;
  hash: string;
  provenance: "catalog" | "secop";
  freshness: "fresh" | "stale" | "unknown";
  relevant: boolean;
  lastSyncedAt: string;
}

function text(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function money(record: Record<string, unknown>, field: string): number {
  const raw = text(record, field).replaceAll(",", "");
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function instant(value: string): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function mapStatus(raw: string, awarded: string): TenderStatus {
  const value = `${raw} ${awarded}`.toLowerCase();
  if (value.includes("adjudic")) return "adjudicado";
  if (value.includes("desiert")) return "desierto";
  if (value.includes("cerrad") || value.includes("liquid")) return "cerrado";
  if (value.includes("evalu") || value.includes("selecci")) return "en_evaluacion";
  return "abierto";
}

function freshness(updatedAt: string | null, closesAt: string | null, status: TenderStatus): "fresh" | "stale" | "unknown" {
  if (!updatedAt && !closesAt) return "unknown";
  if (status === "cerrado" || status === "adjudicado" || status === "desierto") return "stale";
  if (closesAt && Date.parse(closesAt) < Date.now()) return "stale";
  if (updatedAt && Date.now() - Date.parse(updatedAt) > 7 * 24 * 60 * 60 * 1000) return "stale";
  return "fresh";
}

export function normalizeSecop(record: SecopRawRecord, now = new Date().toISOString()): CatalogProcess {
  const f = record.source === "SECOP II" ? SECOP_II_FIELDS : SECOP_I_FIELDS;
  const fields = record.fields;
  const externalId = text(fields, f.id) || text(fields, "id") || sha256(JSON.stringify(fields)).slice(0, 16);
  const publishedAt = instant(text(fields, f.publishedAt));
  const updatedAt = instant(text(fields, f.updatedAt)) ?? publishedAt;
  const closesAt = record.source === "SECOP II" ? instant(text(fields, SECOP_II_FIELDS.closesAt)) : null;
  const status = mapStatus(text(fields, f.status), record.source === "SECOP II" ? text(fields, SECOP_II_FIELDS.awarded) : "");
  const urlField = record.source === "SECOP II" ? fields[SECOP_II_FIELDS.url] : fields[SECOP_I_FIELDS.url];
  const sourceUrl =
    typeof urlField === "string"
      ? urlField
      : urlField && typeof urlField === "object" && "url" in urlField
        ? String((urlField as { url: string }).url)
        : "";
  const payload = {
    source: record.source,
    externalId,
    reference: text(fields, f.reference) || externalId,
    title: text(fields, f.title),
    description: text(fields, f.description),
    entity: text(fields, f.entity),
    entityTaxId: text(fields, f.taxId),
    department: text(fields, f.department),
    municipality: "municipality" in f ? text(fields, f.municipality) : "",
    modality: text(fields, f.modality),
    status,
    phase: record.source === "SECOP II" ? text(fields, SECOP_II_FIELDS.phase) : "",
    value: money(fields, f.value),
    publishedAt,
    updatedAt,
    closesAt,
    unspsc: text(fields, f.unspsc),
    sourceUrl,
  };
  return {
    id: stableId(`secop:${record.source}:${externalId}`),
    ...payload,
    currency: "COP",
    hash: sha256(JSON.stringify(payload)),
    provenance: "secop",
    freshness: freshness(updatedAt, closesAt, status),
    relevant: false,
    lastSyncedAt: now,
  };
}

export function toTender(process: CatalogProcess, overlay?: Partial<Tender>): Tender {
  return {
    id: process.id,
    tenderOpsId: process.id,
    secopId: process.externalId,
    sourceUrl: process.sourceUrl,
    entity: process.entity,
    entityTaxId: process.entityTaxId,
    object: process.title || process.description,
    modality: process.modality,
    value: process.value,
    currency: "COP",
    department: process.department,
    municipality: process.municipality,
    publishedAt: process.publishedAt ?? "",
    closesAt: process.closesAt ?? "",
    status: process.status,
    source: process.source,
    compatibility: overlay?.compatibility ?? 0,
    risk: overlay?.risk ?? ("medio" as RiskLevel),
    recommendation: overlay?.recommendation ?? ("REVISION" as Recommendation),
    owner: overlay?.owner ?? "",
    favorite: overlay?.favorite ?? false,
    watching: overlay?.watching ?? false,
    dynamicsOpportunityId: overlay?.dynamicsOpportunityId ?? null,
    tags: overlay?.tags ?? [process.source, process.status],
    provenance: process.provenance,
    sourceUpdatedAt: process.updatedAt,
    freshness: process.freshness,
  };
}

export function relevantChange(previous: CatalogProcess | undefined, next: CatalogProcess): string[] {
  if (!previous) return ["created"];
  const fields: (keyof CatalogProcess)[] = [
    "title",
    "status",
    "phase",
    "value",
    "closesAt",
    "modality",
    "sourceUrl",
    "department",
  ];
  return fields.filter((field) => previous[field] !== next[field]);
}

export function processMatchesFilters(process: CatalogProcess, filters: {
  search?: string;
  entity?: string;
  taxId?: string;
  modality?: string;
  department?: string;
  municipality?: string;
  status?: string;
  phase?: string;
  minValue?: number;
  maxValue?: number;
  from?: string;
  until?: string;
  unspsc?: string;
  exactId?: string;
}): boolean {
  const haystack = `${process.title} ${process.entity} ${process.externalId} ${process.reference}`.toLowerCase();
  if (filters.exactId && process.externalId !== filters.exactId && process.id !== filters.exactId) return false;
  if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
  if (filters.entity && !process.entity.toLowerCase().includes(filters.entity.toLowerCase())) return false;
  if (filters.taxId && process.entityTaxId.replaceAll(/\D/g, "") !== filters.taxId.replaceAll(/\D/g, "")) return false;
  if (filters.modality && !process.modality.toLowerCase().includes(filters.modality.toLowerCase())) return false;
  if (filters.department && !process.department.toLowerCase().includes(filters.department.toLowerCase())) return false;
  if (filters.municipality && !process.municipality.toLowerCase().includes(filters.municipality.toLowerCase())) return false;
  if (filters.status && process.status !== filters.status && !process.status.includes(filters.status)) return false;
  if (filters.phase && !process.phase.toLowerCase().includes(filters.phase.toLowerCase())) return false;
  if (filters.minValue !== undefined && process.value < filters.minValue) return false;
  if (filters.maxValue !== undefined && process.value > filters.maxValue) return false;
  if (filters.from && (process.publishedAt ?? "") < filters.from) return false;
  if (filters.until && (process.publishedAt ?? "") > filters.until) return false;
  if (filters.unspsc && process.unspsc !== filters.unspsc) return false;
  return true;
}
