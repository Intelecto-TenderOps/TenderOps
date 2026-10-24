import type { ComputedStatus, MissingField, NormalizedProcess, SecopSource } from "./types.js";

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

export function extractUrl(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object" && "url" in value) {
    return asString((value as { url?: unknown }).url);
  }
  return null;
}

export function parseMoney(value: unknown): string | null {
  if (value == null || value === "") return null;
  const raw = typeof value === "number" ? String(value) : asString(value);
  if (!raw) return null;
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  return raw;
}

export function parseDate(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return raw;
}

function hashId(source: SecopSource, externalId: string) {
  return `secop:${source.toLowerCase()}:${externalId}`;
}

export function computeStatus(input: {
  sourceStatus?: string | null;
  openingStatus?: string | null;
  phase?: string | null;
  closingDate?: string | null;
  awarded?: string | null;
}): { status: ComputedStatus; confidence: "high" | "medium" | "low"; reason: string } {
  const source = (input.sourceStatus ?? "").toLowerCase();
  const opening = (input.openingStatus ?? "").toLowerCase();
  const phase = (input.phase ?? "").toLowerCase();
  const awarded = (input.awarded ?? "").toLowerCase();
  const closedByDate = input.closingDate ? new Date(input.closingDate).getTime() < Date.now() : false;

  if (awarded === "si" || source.includes("adjudic")) {
    return { status: "adjudicado", confidence: "high", reason: "La fuente reporta adjudicación." };
  }
  if (source.includes("desiert")) {
    return { status: "desierto", confidence: "high", reason: "La fuente reporta proceso desierto." };
  }
  if (source.includes("celebrado") || source.includes("liquidado") || source.includes("terminado")) {
    return { status: "cerrado", confidence: "high", reason: "La fuente reporta un estado final." };
  }
  if (closedByDate && opening === "abierto") {
    return {
      status: "por_verificar",
      confidence: "low",
      reason: "La apertura figura abierta pero la fecha límite ya venció.",
    };
  }
  if (closedByDate) {
    return { status: "cerrado", confidence: "medium", reason: "La fecha límite confirmada ya venció." };
  }
  if (opening === "abierto" && (source.includes("seleccion") || source.includes("adjudic") || !input.closingDate)) {
    return {
      status: "por_verificar",
      confidence: "low",
      reason: "El indicador de apertura está abierto y el estado o la fecha límite no lo confirman.",
    };
  }
  if (phase.includes("presentación") || phase.includes("presentacion") || source.includes("abierto")) {
    return { status: "abierto", confidence: input.closingDate ? "medium" : "low", reason: "Fase o estado de presentación de ofertas." };
  }
  if (phase.includes("evaluación") || phase.includes("evaluacion") || source.includes("evalu")) {
    return { status: "en_evaluacion", confidence: "medium", reason: "La fuente reporta evaluación." };
  }
  if (opening === "abierto" && !input.closingDate) {
    return {
      status: "por_verificar",
      confidence: "low",
      reason: "El indicador de apertura está abierto, pero no hay fecha límite confirmada.",
    };
  }
  if (!source && !phase) {
    return { status: "por_verificar", confidence: "low", reason: "Faltan estado y fase de la fuente." };
  }
  return { status: "por_verificar", confidence: "low", reason: "Los campos de estado de la fuente son insuficientes o contradictorios." };
}

export function mapSecopII(row: Record<string, unknown>, syncedAt = new Date().toISOString()): NormalizedProcess {
  const externalProcessId = asString(row.id_del_proceso);
  if (!externalProcessId) throw new Error("SECOP II sin id_del_proceso");
  const closingDate = parseDate(row.fecha_de_recepcion_de);
  const computed = computeStatus({
    sourceStatus: asString(row.estado_del_procedimiento) ?? asString(row.estado_resumen),
    openingStatus: asString(row.estado_de_apertura_del_proceso),
    phase: asString(row.fase),
    closingDate,
    awarded: asString(row.adjudicado),
  });
  const missing: MissingField[] = [];
  if (!closingDate) missing.push({ field: "closingDate", reason: "fecha_de_recepcion_de ausente o inválida" });
  if (!extractUrl(row.urlproceso)) missing.push({ field: "sourceUrl", reason: "urlproceso ausente" });
  return {
    id: hashId("SECOP_II", externalProcessId),
    source: "SECOP_II",
    externalProcessId,
    processReference: asString(row.referencia_del_proceso),
    portfolioId: asString(row.id_del_portafolio),
    entityName: asString(row.entidad) ?? "Entidad no informada",
    entityNit: asString(row.nit_entidad),
    title: asString(row.nombre_del_procedimiento) ?? externalProcessId,
    subject: asString(row.descripci_n_del_procedimiento),
    phase: asString(row.fase),
    sourceStatus: asString(row.estado_del_procedimiento),
    sourceOpeningStatus: asString(row.estado_de_apertura_del_proceso),
    publicationDate: parseDate(row.fecha_de_publicacion_del),
    lastSourcePublicationDate: parseDate(row.fecha_de_ultima_publicaci),
    closingDate,
    closingDateConfidence: closingDate ? "confirmed" : "absent",
    estimatedValue: parseMoney(row.precio_base),
    currency: "COP",
    modality: asString(row.modalidad_de_contratacion),
    department: asString(row.departamento_entidad),
    municipality: asString(row.ciudad_entidad),
    mainCategoryCode: asString(row.codigo_principal_de_categoria),
    contractType: asString(row.tipo_de_contrato),
    sourceUrl: extractUrl(row.urlproceso),
    computedStatus: computed.status,
    computedStatusConfidence: computed.confidence,
    computedStatusReason: computed.reason,
    syncedAt,
    sourceUpdatedAt: parseDate(row.fecha_de_ultima_publicaci),
    missing,
    raw: row,
  };
}

export function mapSecopI(row: Record<string, unknown>, syncedAt = new Date().toISOString()): NormalizedProcess {
  const externalProcessId = asString(row.uid) ?? asString(row.numero_de_constancia) ?? asString(row.numero_de_proceso);
  if (!externalProcessId) throw new Error("SECOP I sin identificador");
  const closingDate = parseDate(row.fecha_fin_ejec_contrato);
  const computed = computeStatus({
    sourceStatus: asString(row.estado_del_proceso),
    openingStatus: null,
    phase: null,
    closingDate,
    awarded: null,
  });
  const missing: MissingField[] = [];
  if (!closingDate) missing.push({ field: "closingDate", reason: "SECOP I no publica una fecha de recepción de ofertas equivalente; se omite" });
  return {
    id: hashId("SECOP_I", externalProcessId),
    source: "SECOP_I",
    externalProcessId,
    processReference: asString(row.numero_de_proceso),
    portfolioId: null,
    entityName: asString(row.nombre_entidad) ?? "Entidad no informada",
    entityNit: asString(row.nit_de_la_entidad),
    title: asString(row.detalle_del_objeto_a_contratar) ?? asString(row.objeto_a_contratar) ?? externalProcessId,
    subject: asString(row.objeto_a_contratar),
    phase: null,
    sourceStatus: asString(row.estado_del_proceso),
    sourceOpeningStatus: null,
    publicationDate: parseDate(row.fecha_de_cargue_en_el_secop),
    lastSourcePublicationDate: parseDate(row.fecha_de_cargue_en_el_secop),
    closingDate: null,
    closingDateConfidence: "absent",
    estimatedValue: parseMoney(row.cuantia_proceso),
    currency: "COP",
    modality: asString(row.modalidad_de_contratacion),
    department: null,
    municipality: asString(row.municipios_ejecucion),
    mainCategoryCode: asString(row.id_objeto_a_contratar),
    contractType: asString(row.tipo_de_contrato),
    sourceUrl: asString(row.ruta_proceso_en_secop_i),
    computedStatus: computed.status === "cerrado" && !asString(row.estado_del_proceso) ? "por_verificar" : computed.status,
    computedStatusConfidence: "medium",
    computedStatusReason:
      "SECOP I no expone una fecha de cierre de ofertas equivalente; el estado se deriva del estado_del_proceso.",
    syncedAt,
    sourceUpdatedAt: parseDate(row.fecha_de_cargue_en_el_secop),
    missing,
    raw: row,
  };
}

export function detectExactProcessId(value: string): { source: SecopSource; id: string } | null {
  const trimmed = value.trim();
  if (/^CO1\.(REQ|BDOS|NTC)\.\d+$/i.test(trimmed)) return { source: "SECOP_II", id: trimmed.toUpperCase() };
  if (/^\d{2}-\d{1,2}-\d+$/.test(trimmed) || /^\d{2}-\d{1,2}-\d+-\d+$/.test(trimmed)) {
    return { source: "SECOP_I", id: trimmed };
  }
  return null;
}
