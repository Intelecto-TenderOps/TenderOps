import { loadEnv } from "../config/env.js";
import { catalogStatus, filterCatalog } from "./catalog.js";
import { detectExactProcessId, mapSecopI, mapSecopII } from "./mapper.js";
import { ProcessRepository } from "../db/repos.js";
import { SocrataClient } from "./socrata.js";
import type { AppliedFilter, NormalizedProcess, ProcessSearchQuery, ProcessSearchResult, SecopSource } from "./types.js";
import type { SoqlFilter } from "./soql.js";

const LABELS: Record<string, string> = {
  q: "Texto",
  source: "Fuente",
  entity: "Entidad",
  nit: "NIT",
  department: "Departamento",
  municipality: "Municipio",
  modality: "Modalidad",
  status: "Estado",
  phase: "Fase",
  minValue: "Valor mínimo",
  maxValue: "Valor máximo",
  publishedFrom: "Publicado desde",
  publishedTo: "Publicado hasta",
  closingFrom: "Cierre desde",
  closingTo: "Cierre hasta",
  unspsc: "UNSPSC",
};

export class SecopSearchService {
  constructor(
    private readonly client = new SocrataClient(),
    private readonly env = loadEnv(),
    private readonly repo = new ProcessRepository(),
  ) {}

  async search(query: ProcessSearchQuery): Promise<ProcessSearchResult> {
    const exact = query.exactId ?? (query.q ? detectExactProcessId(query.q) : null);
    if (exact && typeof exact === "object") return this.byExactId(exact.source, exact.id, query);
    if (typeof exact === "string") {
      const detected = detectExactProcessId(exact);
      if (detected) return this.byExactId(detected.source, detected.id, query);
    }

    const mode = this.env.SECOP_SEARCH_MODE;
    if (mode === "indexed") {
      const catalogued = this.fromCatalog(query);
      if (catalogued.items.length) return catalogued;
      if (!(await this.repo.available())) {
        return this.empty("El índice aún no tiene procesos sincronizados.", query, "indexed");
      }
      return this.indexed(query);
    }
    if (mode === "hybrid") {
      const live = await this.live(query);
      const catalogued = this.fromCatalog(query);
      return mergeResults(catalogued, live, query);
    }
    return this.live(query);
  }

  async getById(id: string) {
    const detected = detectExactProcessId(id) ?? (id.startsWith("secop:secop_ii:")
      ? { source: "SECOP_II" as const, id: id.replace("secop:secop_ii:", "") }
      : id.startsWith("secop:secop_i:")
        ? { source: "SECOP_I" as const, id: id.replace("secop:secop_i:", "") }
        : null);
    if (!detected) return null;
    const result = await this.byExactId(detected.source, detected.id, { pageSize: 1 });
    return result.items[0] ?? null;
  }

  private async byExactId(source: SecopSource, id: string, query: ProcessSearchQuery): Promise<ProcessSearchResult> {
    const dataset = source === "SECOP_II" ? this.env.SECOP_II_DATASET_ID : this.env.SECOP_I_DATASET_ID;
    const column = source === "SECOP_II" ? "id_del_proceso" : "uid";
    const result = await this.client.query<Record<string, unknown>>(dataset, source, {
      filters: [{ column, operator: "=", value: id }],
      limit: 5,
    });
    const items = result.rows
      .map((row) => (source === "SECOP_II" ? mapSecopII(row) : mapSecopI(row)))
      .filter((item) => item.externalProcessId.toUpperCase() === id.toUpperCase());
    return {
      items,
      total: items.length,
      totalIsApproximate: false,
      cursor: null,
      mode: "live",
      sourceUpdatedAt: result.lastModified,
      syncedAt: new Date().toISOString(),
      appliedFilters: toFilters({ ...query, q: id, source }),
      warnings: items.length ? [] : [`No hay un proceso ${source} con identificador ${id}.`],
    };
  }

  private async live(query: ProcessSearchQuery): Promise<ProcessSearchResult> {
    const source = query.source === "SECOP_I" ? "SECOP_I" : "SECOP_II";
    const dataset = source === "SECOP_II" ? this.env.SECOP_II_DATASET_ID : this.env.SECOP_I_DATASET_ID;
    const pageSize = Math.min(query.pageSize ?? this.env.SECOP_PAGE_SIZE, 50);
    const offset = decodeCursor(query.cursor);
    const filters = liveFilters(source, query);
    const orderColumn =
      query.sort === "value"
        ? source === "SECOP_II" ? "precio_base" : "cuantia_proceso"
        : source === "SECOP_II"
          ? "fecha_de_ultima_publicaci"
          : "fecha_de_cargue_en_el_secop";
    const result = await this.client.query<Record<string, unknown>>(dataset, source, {
      filters,
      q: query.q,
      limit: pageSize,
      offset,
      order: [{ column: orderColumn, direction: "DESC" }],
    });
    const items = result.rows.map((row) => (source === "SECOP_II" ? mapSecopII(row) : mapSecopI(row)));
    let total: number | null = null;
    try {
      total = await this.client.count(dataset, source, { filters, q: query.q });
    } catch {
      total = null;
    }
    const warnings = [
      "Consulta en vivo sobre datos.gov.co. El origen se actualiza periódicamente, no en tiempo real.",
    ];
    if (query.source === "all") warnings.push("El modo live consulta una fuente por petición; use source=SECOP_I para la otra.");
    if (source === "SECOP_I" && (query.closingFrom || query.closingTo)) {
      warnings.push("SECOP I no tiene fecha de recepción de ofertas equivalente; el filtro de cierre no se aplicó.");
    }
    return {
      items,
      total,
      totalIsApproximate: total == null,
      cursor: items.length === pageSize ? String(offset + pageSize) : null,
      mode: "live",
      sourceUpdatedAt: result.lastModified,
      syncedAt: new Date().toISOString(),
      appliedFilters: toFilters(query),
      warnings,
    };
  }

  private async indexed(query: ProcessSearchQuery): Promise<ProcessSearchResult> {
    const page = await this.repo.search(query);
    return {
      ...page,
      mode: "indexed",
      appliedFilters: toFilters(query),
      warnings: page.items.length ? [] : ["El índice no devolvió coincidencias."],
    };
  }

  private fromCatalog(query: ProcessSearchQuery): ProcessSearchResult {
    const items = filterCatalog({
      q: query.q,
      source: query.source,
      entity: query.entity,
      department: query.department,
      modality: query.modality,
    }).sort((a, b) => (b.lastSourcePublicationDate ?? "").localeCompare(a.lastSourcePublicationDate ?? ""));
    const status = catalogStatus();
    return {
      items,
      total: items.length,
      totalIsApproximate: false,
      cursor: null,
      mode: "indexed",
      sourceUpdatedAt: status.lastSuccessAt,
      syncedAt: status.lastSuccessAt ?? new Date().toISOString(),
      appliedFilters: toFilters(query),
      warnings: items.length ? [] : ["El catálogo local aún no tiene coincidencias."],
    };
  }

  private empty(warning: string, query: ProcessSearchQuery, mode: ProcessSearchResult["mode"]): ProcessSearchResult {
    return {
      items: [],
      total: 0,
      totalIsApproximate: false,
      cursor: null,
      mode,
      sourceUpdatedAt: null,
      syncedAt: new Date().toISOString(),
      appliedFilters: toFilters(query),
      warnings: [warning],
    };
  }
}

function liveFilters(source: SecopSource, query: ProcessSearchQuery): SoqlFilter[] {
  const filters: SoqlFilter[] = [];
  const column = (ii: string, i: string) => (source === "SECOP_II" ? ii : i);
  if (query.entity) filters.push({ column: column("entidad", "nombre_entidad"), operator: "like", value: `%${query.entity}%` });
  if (query.nit) filters.push({ column: column("nit_entidad", "nit_de_la_entidad"), operator: "=", value: query.nit });
  if (query.department && source === "SECOP_II") filters.push({ column: "departamento_entidad", operator: "like", value: `%${query.department}%` });
  if (query.municipality) filters.push({ column: column("ciudad_entidad", "municipios_ejecucion"), operator: "like", value: `%${query.municipality}%` });
  if (query.modality) filters.push({ column: "modalidad_de_contratacion", operator: "like", value: `%${query.modality}%` });
  if (query.status && source === "SECOP_II") filters.push({ column: "estado_del_procedimiento", operator: "like", value: `%${query.status}%` });
  if (query.status && source === "SECOP_I") filters.push({ column: "estado_del_proceso", operator: "like", value: `%${query.status}%` });
  if (query.phase && source === "SECOP_II") filters.push({ column: "fase", operator: "like", value: `%${query.phase}%` });
  if (query.minValue != null) filters.push({ column: column("precio_base", "cuantia_proceso"), operator: ">=", value: query.minValue });
  if (query.maxValue != null) filters.push({ column: column("precio_base", "cuantia_proceso"), operator: "<=", value: query.maxValue });
  if (query.publishedFrom) filters.push({ column: column("fecha_de_publicacion_del", "fecha_de_cargue_en_el_secop"), operator: ">=", value: query.publishedFrom });
  if (query.publishedTo) filters.push({ column: column("fecha_de_publicacion_del", "fecha_de_cargue_en_el_secop"), operator: "<=", value: query.publishedTo });
  if (source === "SECOP_II" && query.closingFrom) filters.push({ column: "fecha_de_recepcion_de", operator: ">=", value: String(query.closingFrom) });
  if (source === "SECOP_II" && query.closingTo) filters.push({ column: "fecha_de_recepcion_de", operator: "<=", value: String(query.closingTo) });
  if (query.unspsc && source === "SECOP_II") filters.push({ column: "codigo_principal_de_categoria", operator: "like", value: `%${query.unspsc}%` });
  return filters;
}

function toFilters(query: ProcessSearchQuery): AppliedFilter[] {
  return Object.entries(query)
    .filter(([key, value]) => value != null && value !== "" && key in LABELS)
    .map(([field, value]) => ({
      id: `${field}:${String(value)}`,
      field,
      label: LABELS[field] ?? field,
      value: String(value),
    }));
}

function mergeResults(
  catalogued: ProcessSearchResult,
  live: ProcessSearchResult,
  query: ProcessSearchQuery,
): ProcessSearchResult {
  const map = new Map<string, (typeof live.items)[number]>();
  for (const item of [...live.items, ...catalogued.items]) map.set(item.id, item);
  const items = [...map.values()].sort((a, b) =>
    (b.lastSourcePublicationDate ?? b.publicationDate ?? "").localeCompare(a.lastSourcePublicationDate ?? a.publicationDate ?? ""),
  );
  const pageSize = Math.min(query.pageSize ?? 25, 50);
  const offset = Number(query.cursor ?? 0) || 0;
  const page = items.slice(offset, offset + pageSize);
  const warnings = [
    ...live.warnings,
    catalogued.items.length ? `Catálogo local: ${catalogued.items.length} procesos recientes.` : "",
  ].filter(Boolean);
  return {
    items: page,
    total: items.length,
    totalIsApproximate: live.totalIsApproximate,
    cursor: offset + page.length < items.length ? String(offset + page.length) : null,
    mode: "hybrid",
    sourceUpdatedAt: live.sourceUpdatedAt ?? catalogued.sourceUpdatedAt,
    syncedAt: new Date().toISOString(),
    appliedFilters: toFilters(query),
    warnings,
  };
}

function decodeCursor(cursor?: string) {
  if (!cursor) return 0;
  const value = Number(cursor);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function toFrontendTender(process: NormalizedProcess) {
  return {
    id: process.id,
    tenderOpsId: process.id,
    secopId: process.externalProcessId,
    sourceUrl: process.sourceUrl ?? "",
    entity: process.entityName,
    entityTaxId: process.entityNit ?? "",
    object: process.title,
    modality: process.modality ?? "",
    value: Number(process.estimatedValue ?? 0),
    currency: "COP" as const,
    department: process.department ?? "",
    municipality: process.municipality ?? "",
    publishedAt: process.publicationDate ?? process.syncedAt,
    closesAt: process.closingDate ?? "",
    status: process.computedStatus === "por_verificar" ? "abierto" : process.computedStatus,
    source: process.source === "SECOP_I" ? "SECOP I" : "SECOP II",
    compatibility: 0,
    risk: "medio",
    recommendation: "REVISION",
    owner: "",
    favorite: false,
    watching: false,
    dynamicsOpportunityId: null,
    tags: process.missing.map((item) => item.field),
    computedStatus: process.computedStatus,
    computedStatusReason: process.computedStatusReason,
    missing: process.missing,
    sourceUpdatedAt: process.sourceUpdatedAt,
    syncedAt: process.syncedAt,
  };
}
