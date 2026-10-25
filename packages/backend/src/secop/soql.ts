const SECOP_II_COLUMNS = new Set([
  "id_del_proceso",
  "referencia_del_proceso",
  "id_del_portafolio",
  "entidad",
  "nit_entidad",
  "nombre_del_procedimiento",
  "descripci_n_del_procedimiento",
  "fase",
  "estado_del_procedimiento",
  "estado_de_apertura_del_proceso",
  "estado_resumen",
  "fecha_de_publicacion_del",
  "fecha_de_ultima_publicaci",
  "fecha_de_recepcion_de",
  "precio_base",
  "modalidad_de_contratacion",
  "departamento_entidad",
  "ciudad_entidad",
  "codigo_principal_de_categoria",
  "urlproceso",
  "tipo_de_contrato",
  "adjudicado",
]);

const SECOP_I_COLUMNS = new Set([
  "uid",
  "numero_de_proceso",
  "numero_de_constancia",
  "nombre_entidad",
  "nit_de_la_entidad",
  "detalle_del_objeto_a_contratar",
  "objeto_a_contratar",
  "modalidad_de_contratacion",
  "estado_del_proceso",
  "cuantia_proceso",
  "tipo_de_contrato",
  "municipios_ejecucion",
  "fecha_de_cargue_en_el_secop",
  "ruta_proceso_en_secop_i",
  "id_objeto_a_contratar",
]);

const OPERATORS = new Set(["=", "!=", ">", ">=", "<", "<=", "like", "is null", "is not null"]);

export type SoqlFilter = {
  column: string;
  operator: string;
  value?: string | number;
};

export type SoqlQuery = {
  select?: string[];
  filters?: SoqlFilter[];
  rawWhere?: never;
  q?: string;
  order?: { column: string; direction: "ASC" | "DESC" }[];
  limit?: number;
  offset?: number;
};

export function allowedColumns(source: "SECOP_II" | "SECOP_I") {
  return source === "SECOP_II" ? SECOP_II_COLUMNS : SECOP_I_COLUMNS;
}

export function escapeSoqlString(value: string) {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

function assertColumn(source: "SECOP_II" | "SECOP_I", column: string) {
  if (!allowedColumns(source).has(column)) {
    throw new Error(`Columna SoQL no permitida: ${column}`);
  }
}

function assertOperator(operator: string) {
  if (!OPERATORS.has(operator.toLowerCase())) {
    throw new Error(`Operador SoQL no permitido: ${operator}`);
  }
}

export function buildWhere(source: "SECOP_II" | "SECOP_I", filters: SoqlFilter[]) {
  return filters
    .map((filter) => {
      assertColumn(source, filter.column);
      assertOperator(filter.operator);
      const operator = filter.operator.toLowerCase();
      if (operator === "is null" || operator === "is not null") {
        return `${filter.column} ${operator}`;
      }
      if (typeof filter.value === "number") {
        if (!Number.isFinite(filter.value)) throw new Error("Valor numérico inválido");
        return `${filter.column} ${operator} ${filter.value}`;
      }
      if (typeof filter.value !== "string") throw new Error("Valor de filtro inválido");
      if (operator === "like") {
        return `upper(${filter.column}) like ${escapeSoqlString(filter.value.toUpperCase())}`;
      }
      return `${filter.column} ${operator} ${escapeSoqlString(filter.value)}`;
    })
    .join(" AND ");
}

export function buildQuery(source: "SECOP_II" | "SECOP_I", query: SoqlQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.select?.length) {
    for (const column of query.select) assertColumn(source, column);
    params.set("$select", query.select.join(","));
  }
  if (query.filters?.length) params.set("$where", buildWhere(source, query.filters));
  if (query.q?.trim()) params.set("$q", query.q.trim().slice(0, 240));
  const order = query.order?.length
    ? query.order
    : [{ column: source === "SECOP_II" ? "fecha_de_ultima_publicaci" : "fecha_de_cargue_en_el_secop", direction: "DESC" as const }];
  const orderParts = order.map((item) => {
    assertColumn(source, item.column);
    return `${item.column} ${item.direction}`;
  });
  const tieBreaker = source === "SECOP_II" ? "id_del_proceso" : "uid";
  if (!order.some((item) => item.column === tieBreaker)) orderParts.push(`${tieBreaker} ASC`);
  params.set("$order", orderParts.join(","));
  params.set("$limit", String(Math.min(Math.max(query.limit ?? 25, 1), 100)));
  params.set("$offset", String(Math.max(query.offset ?? 0, 0)));
  return params;
}
