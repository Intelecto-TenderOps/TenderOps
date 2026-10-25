import { loadConfig } from "../shared/config.js";
import { DomainError } from "../shared/errors.js";

export const SECOP_II_FIELDS = {
  id: "id_del_proceso",
  reference: "referencia_del_proceso",
  title: "nombre_del_procedimiento",
  description: "descripci_n_del_procedimiento",
  entity: "entidad",
  taxId: "nit_entidad",
  department: "departamento_entidad",
  municipality: "ciudad_entidad",
  modality: "modalidad_de_contratacion",
  status: "estado_del_procedimiento",
  phase: "fase",
  value: "precio_base",
  publishedAt: "fecha_de_publicacion_del",
  updatedAt: "fecha_de_ultima_publicaci",
  closesAt: "fecha_de_recepcion_de",
  unspsc: "codigo_principal_de_categoria",
  url: "urlproceso",
  awarded: "adjudicado",
} as const;

export const SECOP_I_FIELDS = {
  id: "uid",
  reference: "numero_de_proceso",
  title: "objeto_a_contratar",
  description: "detalle_del_objeto_a_contratar",
  entity: "nombre_entidad",
  taxId: "nit_de_la_entidad",
  department: "departamento_entidad",
  municipality: "municipio_entidad",
  modality: "modalidad_de_contratacion",
  status: "estado_del_proceso",
  value: "cuantia_proceso",
  publishedAt: "fecha_de_cargue_en_el_secop",
  updatedAt: "ultima_actualizacion",
  unspsc: "id_clase",
  url: "ruta_proceso_en_secop_i",
} as const;

export type SecopSource = "SECOP II" | "SECOP I";

export interface SecopRawRecord {
  source: SecopSource;
  dataset: string;
  fields: Record<string, unknown>;
}

export interface SecopQuery {
  exactId?: string;
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
  updatedSince?: string;
  limit?: number;
  offset?: number;
  order?: string;
  source?: SecopSource | "all";
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function like(value: string): string {
  return quote(`%${value.replaceAll("%", "")}%`);
}

function buildWhere(source: SecopSource, query: SecopQuery): string[] {
  const f = source === "SECOP II" ? SECOP_II_FIELDS : SECOP_I_FIELDS;
  const clauses: string[] = [];
  if (query.exactId) clauses.push(`${f.id}=${quote(query.exactId)}`);
  if (query.search) {
    const term = like(query.search);
    clauses.push(`(upper(${f.title}) like upper(${term}) or upper(${f.entity}) like upper(${term}) or ${f.id}=${quote(query.search)})`);
  }
  if (query.entity) clauses.push(`upper(${f.entity}) like upper(${like(query.entity)})`);
  if (query.taxId) clauses.push(`${f.taxId}=${quote(query.taxId.replaceAll(".", "").replaceAll("-", ""))}`);
  if (query.modality) clauses.push(`upper(${f.modality}) like upper(${like(query.modality)})`);
  if (query.department) clauses.push(`upper(${f.department}) like upper(${like(query.department)})`);
  if (query.municipality && "municipality" in f) clauses.push(`upper(${f.municipality}) like upper(${like(query.municipality)})`);
  if (query.status) clauses.push(`upper(${f.status}) like upper(${like(query.status)})`);
  if (query.phase && source === "SECOP II") clauses.push(`upper(${SECOP_II_FIELDS.phase}) like upper(${like(query.phase)})`);
  if (query.unspsc) clauses.push(`${f.unspsc}=${quote(query.unspsc)}`);
  if (query.minValue !== undefined) clauses.push(`${f.value} >= ${query.minValue}`);
  if (query.maxValue !== undefined) clauses.push(`${f.value} <= ${query.maxValue}`);
  if (query.from) clauses.push(`${f.publishedAt} >= ${quote(query.from)}`);
  if (query.until) clauses.push(`${f.publishedAt} <= ${quote(query.until)}`);
  if (query.updatedSince) clauses.push(`${f.updatedAt} >= ${quote(query.updatedSince)}`);
  return clauses;
}

async function fetchDataset(dataset: string, source: SecopSource, query: SecopQuery, signal?: AbortSignal): Promise<SecopRawRecord[]> {
  const config = loadConfig();
  const params = new URLSearchParams();
  params.set("$limit", String(Math.min(query.limit ?? 25, 100)));
  params.set("$offset", String(query.offset ?? 0));
  const where = buildWhere(source, query);
  if (where.length) params.set("$where", where.join(" and "));
  params.set("$order", query.order ?? `${source === "SECOP II" ? SECOP_II_FIELDS.updatedAt : SECOP_I_FIELDS.updatedAt} DESC`);
  const url = `https://www.datos.gov.co/resource/${dataset}.json?${params.toString()}`;
  const headers: Record<string, string> = { accept: "application/json", "user-agent": "TenderOps/1.0" };
  if (config.socrataAppToken) headers["X-App-Token"] = config.socrataAppToken;
  const response = await fetch(url, { headers, signal });
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") ?? "2");
    throw new DomainError(503, "secop_rate_limited", true, Number.isFinite(retryAfter) ? retryAfter : 2);
  }
  if (!response.ok) throw new DomainError(502, `secop_http_${response.status}`, isRetryable(response.status));
  const rows = (await response.json()) as Record<string, unknown>[];
  return rows.map((fields) => ({ source, dataset, fields }));
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function querySecop(query: SecopQuery, signal?: AbortSignal): Promise<SecopRawRecord[]> {
  const config = loadConfig();
  const sources: SecopSource[] =
    query.source === "SECOP I" ? ["SECOP I"] : query.source === "SECOP II" ? ["SECOP II"] : ["SECOP II", "SECOP I"];
  const results: SecopRawRecord[] = [];
  for (const source of sources) {
    const dataset = source === "SECOP II" ? config.secopIiDataset : config.secopIDataset;
    const page = await fetchDataset(dataset, source, query, signal);
    results.push(...page);
  }
  return results;
}

export async function fetchSecopMetadata(dataset: string, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(`https://www.datos.gov.co/api/views/${dataset}.json`, {
    headers: { accept: "application/json", "user-agent": "TenderOps/1.0" },
    signal,
  });
  if (!response.ok) throw new DomainError(502, `secop_metadata_http_${response.status}`, true);
  const body = (await response.json()) as { columns?: { fieldName?: string }[] };
  return (body.columns ?? []).map((column) => column.fieldName ?? "").filter(Boolean);
}

export function validateKnownFields(source: SecopSource, fields: string[]): string[] {
  const expected = Object.values(source === "SECOP II" ? SECOP_II_FIELDS : SECOP_I_FIELDS);
  return expected.filter((field) => !fields.includes(field));
}
