import { FilterPanel } from "./filters";
import { useState } from "react";
import type { ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Check,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { z } from "zod";
import { useUi } from "../../shared/ui-store";
import {
  Badge,
  DataTable,
  day,
  Empty,
  Feedback,
  FormDialog,
  money,
  Notice,
  PageHeading,
  required,
  Stat,
} from "./ui";
import type { FormSpec } from "./ui";
import { can, filterOpportunities, validateFilters } from "./repository";
import { describeError, useCommand } from "./hooks";
import type { Filters, WorkbenchContext, WorkspaceData } from "./types";

export interface ScreenProps {
  context: WorkbenchContext;
  data: WorkspaceData;
}
const emptyFilters: Filters = {
  query: "",
  region: "",
  modality: "",
  source: "",
  minAmount: "",
  maxAmount: "",
  from: "",
  until: "",
  stage: "",
};
const noComparisons: string[] = [];
const filterLabels: Record<keyof Filters, string> = {
  query: "Buscar por objeto, entidad o número",
  region: "Ubicación",
  modality: "Modalidad",
  source: "Fuente",
  minAmount: "Valor mínimo (COP)",
  maxAmount: "Valor máximo (COP)",
  from: "Cierre desde",
  until: "Cierre hasta",
  stage: "Etapa",
};
export function Dashboard({ context, data }: ScreenProps): ReactElement {
  const upcoming = [...data.opportunities]
    .filter((op) => op.stage !== "Cerrada")
    .sort((a, b) => a.closesAt.localeCompare(b.closesAt))
    .slice(0, 4);
  const open = data.opportunities.filter((op) => op.stage !== "Cerrada");
  const pending = data.approvals.filter(
    (item) => item.status !== "Aprobada",
  ).length;
  return (
    <section>
      <PageHeading
        eyebrow="TU BANDEJA DE TRABAJO"
        title="Elige dónde concentrar tu equipo"
        description="Oportunidades, decisiones y entregables que requieren atención."
      >
        <Link to={context.base + "/opportunities"} className="primary">
          <Search size={17} aria-hidden="true" /> Explorar oportunidades
        </Link>
      </PageHeading>
      <div className="stats-row">
        <Stat
          label="Procesos en seguimiento"
          value={open.length}
          detail="Expedientes activos de esta empresa"
        />
        <Stat
          label="En evaluación"
          value={
            data.opportunities.filter((op) => op.stage === "Evaluación").length
          }
          detail="Revisión de requisitos y evidencia"
        />
        <Stat
          label="Aprobaciones pendientes"
          value={pending}
          detail="Por disciplina y versión de análisis"
        />
        <Stat
          label="Entregables por completar"
          value={
            data.checklist.filter((item) => item.state !== "Completado").length
          }
          detail="Asignados al equipo de trabajo"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PRÓXIMOS CIERRES</p>
              <h2>La agenda que no puede esperar</h2>
            </div>
            <Link to={context.base + "/tasks"}>
              Ver tareas <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {upcoming.map((op, index) => (
            <Link
              className="deadline-row"
              key={op.id}
              to={`${context.base}/opportunities/${op.id}`}
            >
              <div className="deadline-number">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <span className="overline">
                  {op.reference} · {op.region}
                </span>
                <h3>{op.title}</h3>
                <p>{op.buyer}</p>
              </div>
              <div className="deadline-meta">
                <strong>{day(op.closesAt)}</strong>
                <Badge>{op.stage}</Badge>
              </div>
            </Link>
          ))}
        </section>
        <section className="panel">
          <p className="eyebrow">PUNTOS DE ATENCIÓN</p>
          <h2>Antes de decidir</h2>
          <ul className="attention-list">
            <li>
              <span className="attention-index">01</span>
              <div>
                <strong>
                  {
                    data.requirements.filter(
                      (req) => req.status === "No cumple" && req.mandatory,
                    ).length
                  }{" "}
                  requisitos bloqueantes
                </strong>
                <p>Un puntaje favorable no reemplaza su resolución.</p>
                <Link
                  to={`${context.base}/opportunities/${data.opportunities[0].id}/requirements`}
                >
                  Revisar matriz
                </Link>
              </div>
            </li>
            <li>
              <span className="attention-index">02</span>
              <div>
                <strong>
                  {data.alerts.filter((alert) => !alert.read).length} alertas
                  sin leer
                </strong>
                <p>Cambios, adendas y fechas con contexto.</p>
                <Link to={context.base + "/alerts"}>Abrir alertas</Link>
              </div>
            </li>
            <li>
              <span className="attention-index">03</span>
              <div>
                <strong>
                  {
                    data.sync.filter((item) => item.status === "Conflicto")
                      .length
                  }{" "}
                  conflicto de sincronización
                </strong>
                <p>Revisa los campos manuales antes de resolver.</p>
                <Link to={context.base + "/dynamics"}>Revisar integración</Link>
              </div>
            </li>
          </ul>
        </section>
      </div>
      <div className="section-label">
        <h2>Del descubrimiento a la propuesta</h2>
        <p>El expediente conserva las versiones y decisiones de cada paso.</p>
      </div>
      <div className="flow-strip">
        {[
          "Descubierta",
          "Evaluación",
          "Decisión",
          "Preparación",
          "Presentada",
          "Cerrada",
        ].map((stage, index) => (
          <Link
            key={stage}
            to={`${context.base}/opportunities?stage=${encodeURIComponent(stage)}`}
          >
            <span>0{index + 1}</span>
            <strong>{stage}</strong>
            <small>
              {data.opportunities.filter((op) => op.stage === stage).length}{" "}
              procesos
            </small>
          </Link>
        ))}
      </div>
    </section>
  );
}
export function Opportunities({ context, data }: ScreenProps): ReactElement {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(
    Object.keys(emptyFilters).map((key) => [key, params.get(key) ?? ""]),
  ) as unknown as Filters;
  const [error, setError] = useState<string>("");
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const mutation = useCommand(context);
  const comparisons = useUi(
    (state) => state.comparisons[context.companyId] ?? noComparisons,
  );
  const toggle = useUi((state) => state.compare);
  let rows = data.opportunities;
  try {
    rows = filterOpportunities(data.opportunities, filters);
  } catch (failure) {
    rows = [];
    if (!error)
      return (
        <section>
          <PageHeading title="Revisa los filtros de búsqueda" />
          <Notice tone="warning">{describeError(failure)}</Notice>
          <Link className="primary" to={context.base + "/opportunities"}>
            Limpiar filtros
          </Link>
        </section>
      );
  }
  const regions = [...new Set(data.opportunities.map((op) => op.region))];
  return (
    <section>
      <PageHeading
        eyebrow="DESCUBRIMIENTO"
        title="Encuentra la próxima oportunidad"
        description="Busca por contexto, compara procesos y conserva tus criterios."
      >
        <Link className="secondary-link" to={context.base + "/saved-searches"}>
          <Bookmark size={17} aria-hidden="true" /> Búsquedas guardadas
        </Link>
      </PageHeading>
      <FilterPanel
        formId="opportunity-filters"
        active={Object.entries(filters)
          .filter(([, value]) => value)
          .map(([key, value]) => ({
            key,
            label: `${filterLabels[key as keyof Filters]}: ${value}`,
            remove: () => {
              const next = new URLSearchParams(params);
              next.delete(key);
              setParams(next);
              setError("");
            },
          }))}
        clear={() => {
          setParams({});
          setError("");
        }}
      >
        <form
          id="opportunity-filters"
          className="search-panel"
          key={"filters-" + params.toString()}
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const next = Object.fromEntries(
              Object.keys(emptyFilters).map((key) => [
                key,
                String(form.get(key) ?? ""),
              ]),
            ) as unknown as Filters;
            try {
              validateFilters(next);
              setError("");
              event.currentTarget.closest("dialog")?.close();
              setParams(
                Object.fromEntries(
                  Object.entries(next).filter(([, value]) => value),
                ),
              );
            } catch (failure) {
              setError(describeError(failure));
            }
          }}
        >
          <div className="search-line">
            <div className="search-input">
              <Search size={19} aria-hidden="true" />
              <label htmlFor="search-query">{filterLabels.query}</label>
              <input
                id="search-query"
                name="query"
                defaultValue={filters.query}
                placeholder="Palabras clave, entidad o número de proceso"
              />
            </div>
          </div>
          <div className="quick-filters">
            {(["region", "modality", "stage", "source"] as const).map((key) => (
              <label key={key}>
                {filterLabels[key]}
                <select name={key} defaultValue={filters[key]}>
                  <option value="">Todas</option>
                  {(key === "region"
                    ? regions
                    : key === "modality"
                      ? ["Licitación pública", "Selección abreviada"]
                      : key === "stage"
                        ? [
                            "Descubierta",
                            "Evaluación",
                            "Decisión",
                            "Preparación",
                            "Presentada",
                            "Cerrada",
                          ]
                        : ["SECOP II"]
                  ).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="advanced-filters">
            {(["minAmount", "maxAmount", "from", "until"] as const).map(
              (key) => (
                <label key={key}>
                  {filterLabels[key]}
                  <input
                    name={key}
                    defaultValue={filters[key]}
                    type={key === "from" || key === "until" ? "date" : "text"}
                    inputMode={key.includes("Amount") ? "decimal" : undefined}
                  />
                </label>
              ),
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </FilterPanel>
      <div className="results-toolbar">
        <p>
          <strong>{rows.length}</strong> procesos encontrados{" "}
          <span className="muted">· Colombia</span>
        </p>
        <div>
          <button
            onClick={() =>
              setDialog({
                title: "Guardar búsqueda",
                fields: [{ name: "name", label: "Nombre de la búsqueda" }],
                schema: z.object({ name: required.max(100) }),
                onSave: (values) =>
                  mutation.mutateAsync({
                    type: "search.save",
                    values: { ...filters, ...values, active: true },
                  }),
              })
            }
          >
            <Bookmark size={16} aria-hidden="true" /> Guardar búsqueda
          </button>
          <Link className="secondary-link" to={context.base + "/compare"}>
            Comparar ({comparisons.length}/10)
          </Link>
        </div>
      </div>
      <DataTable
        key={"results-" + params.toString()}
        rows={rows}
        label="Oportunidades"
        columns={[
          {
            key: "select",
            label: "Comparar",
            render: (op) => (
              <input
                type="checkbox"
                aria-label={`Comparar ${op.reference}`}
                checked={comparisons.includes(op.id)}
                disabled={
                  !comparisons.includes(op.id) && comparisons.length >= 10
                }
                onChange={() => toggle(context.companyId, op.id)}
              />
            ),
          },
          {
            key: "title",
            label: "Proceso / entidad",
            sort: (op) => op.title,
            render: (op) => (
              <div className="process-cell">
                <span className="overline">
                  {op.reference} · {op.source}
                </span>
                <Link to={`${context.base}/opportunities/${op.id}`}>
                  {op.title}
                </Link>
                <small>
                  {op.buyer} · {op.region}
                </small>
              </div>
            ),
          },
          {
            key: "value",
            label: "Presupuesto",
            sort: (op) => op.amount.padStart(24, "0"),
            render: (op) => (
              <span className="money-value">
                {money(op.amount, op.currency)}
              </span>
            ),
          },
          {
            key: "fit",
            label: "Encaje",
            sort: (op) => op.fit ?? -1,
            render: (op) =>
              op.fit === null ? (
                <span className="muted">Sin evaluar</span>
              ) : (
                <div className="fit-cell">
                  <strong>{op.fit}%</strong>
                  <div className="mini-track">
                    <span style={{ width: `${op.fit}%` }} />
                  </div>
                  <small>Confianza {op.confidence}%</small>
                </div>
              ),
          },
          {
            key: "stage",
            label: "Etapa",
            sort: (op) => op.stage,
            render: (op) => <Badge>{op.stage}</Badge>,
          },
          {
            key: "close",
            label: "Cierre",
            sort: (op) => op.closesAt,
            render: (op) => (
              <>
                <strong className="date-value">{day(op.closesAt)}</strong>
                <small className="cell-sub">Bogotá · UTC−5</small>
              </>
            ),
          },
        ]}
      />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
export function Comparison({ context, data }: ScreenProps): ReactElement {
  const selected = useUi(
    (state) => state.comparisons[context.companyId] ?? noComparisons,
  );
  const toggle = useUi((state) => state.compare);
  const clear = useUi((state) => state.clearComparison);
  const rows = data.opportunities.filter((op) => selected.includes(op.id));
  return (
    <section>
      <PageHeading
        title="Compara con el mismo criterio"
        description="Hasta diez procesos. Cada cifra conserva su moneda y fecha."
      >
        <Link to={context.base + "/opportunities"} className="primary">
          Elegir procesos
        </Link>
        {rows.length > 0 && (
          <button onClick={() => clear(context.companyId)}>
            Limpiar selección
          </button>
        )}
      </PageHeading>
      {!rows.length ? (
        <Empty title="Selecciona procesos para compararlos">
          Marca la casilla Comparar en los resultados de búsqueda.
        </Empty>
      ) : (
        <div
          className="comparison-scroll"
          role="region"
          aria-label="Comparación de oportunidades"
          tabIndex={0}
        >
          <table className="comparison-table">
            <caption className="sr-only">
              Comparación de oportunidades seleccionadas
            </caption>
            <thead>
              <tr>
                <th scope="col">Criterio</th>
                {rows.map((op) => (
                  <th scope="col" key={op.id}>
                    <span className="overline">{op.reference}</span>
                    <Link to={`${context.base}/opportunities/${op.id}`}>
                      {op.title}
                    </Link>
                    <button onClick={() => toggle(context.companyId, op.id)}>
                      Quitar {op.reference}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "Entidad",
                "Presupuesto original",
                "Ubicación",
                "Cierre",
                "Etapa",
                "Encaje",
                "Confianza",
                "Bloqueos",
                "Recomendación",
              ].map((label, index) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {rows.map((op) => (
                    <td key={op.id}>
                      {
                        [
                          op.buyer,
                          money(op.amount, op.currency),
                          op.region,
                          day(op.closesAt),
                          op.stage,
                          op.fit === null ? "Indeterminado" : `${op.fit}%`,
                          op.confidence === null
                            ? "Desconocida"
                            : `${op.confidence}%`,
                          String(
                            data.requirements.filter(
                              (req) =>
                                req.opportunityId === op.id &&
                                req.mandatory &&
                                req.status === "No cumple",
                            ).length,
                          ),
                          op.recommendation,
                        ][index]
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
export function SavedSearches({ context, data }: ScreenProps): ReactElement {
  const mutation = useCommand(context);
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  return (
    <section>
      <PageHeading
        title="Tus búsquedas, listas para volver"
        description="Conserva criterios y controla las alertas de coincidencia."
      >
        <Link className="primary" to={context.base + "/opportunities"}>
          <Plus size={17} aria-hidden="true" /> Crear desde una búsqueda
        </Link>
      </PageHeading>
      <DataTable
        rows={data.searches}
        label="Búsquedas guardadas"
        empty="Todavía no has guardado búsquedas"
        columns={[
          {
            key: "name",
            label: "Búsqueda",
            sort: (row) => row.name,
            render: (row) => (
              <>
                <strong>{row.name}</strong>
                <small className="cell-sub">
                  {[row.query, row.region, row.modality]
                    .filter(Boolean)
                    .join(" · ") || "Todos los procesos"}
                </small>
              </>
            ),
          },
          {
            key: "state",
            label: "Alertas",
            render: (row) => (
              <Badge>{row.active ? "Activas" : "Pausadas"}</Badge>
            ),
          },
          {
            key: "actions",
            label: "Acciones",
            render: (row) => (
              <div className="row-actions">
                <Link
                  to={
                    context.base +
                    "/opportunities?" +
                    new URLSearchParams(
                      Object.entries(row).filter(
                        ([key, value]) =>
                          !["id", "name", "active"].includes(key) &&
                          typeof value === "string",
                      ) as [string, string][],
                    ).toString()
                  }
                >
                  Ejecutar
                </Link>
                <button
                  onClick={() =>
                    setDialog({
                      title: "Editar búsqueda",
                      fields: [
                        { name: "name", label: "Nombre" },
                        {
                          name: "active",
                          label: "Recibir alertas",
                          type: "checkbox",
                        },
                      ],
                      initial: { name: row.name, active: row.active },
                      schema: z.object({
                        name: required.max(100),
                        active: z.boolean(),
                      }),
                      onSave: (values) =>
                        mutation.mutateAsync({
                          type: "search.save",
                          id: row.id,
                          values: { ...row, ...values },
                        }),
                    })
                  }
                >
                  Editar
                </button>
                <button
                  onClick={() =>
                    setDialog({
                      title: "Eliminar búsqueda",
                      description:
                        "Se eliminarán los criterios guardados; los expedientes permanecen disponibles.",
                      fields: [
                        {
                          name: "confirmation",
                          label: "Escribe ELIMINAR para confirmar",
                        },
                      ],
                      schema: z.object({
                        confirmation: z.literal("ELIMINAR", {
                          error: "Escribe ELIMINAR.",
                        }),
                      }),
                      submitLabel: "Eliminar búsqueda",
                      onSave: (values) =>
                        mutation.mutateAsync({
                          type: "search.delete",
                          id: row.id,
                          values,
                        }),
                    })
                  }
                >
                  Eliminar
                </button>
              </div>
            ),
          },
        ]}
      />
      <Feedback error={mutation.error} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
export function Alerts({ context, data }: ScreenProps): ReactElement {
  const [filter, setFilter] = useState<string>("Todas");
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const mutation = useCommand(context);
  const rows = data.alerts.filter(
    (alert) =>
      filter === "Todas" ||
      (filter === "Sin leer" && !alert.read) ||
      (filter === "Alta prioridad" && alert.urgency === "Alta") ||
      (filter === "Silenciadas" && !!alert.mutedUntil),
  );
  return (
    <section>
      <PageHeading
        title="Cambios que merecen tu atención"
        description="Cada alerta explica su razón y conserva el enlace al expediente."
      >
        <Link className="secondary-link" to={context.base + "/settings"}>
          Preferencias de notificación
        </Link>
      </PageHeading>
      <FilterPanel
        active={
          filter === "Todas"
            ? []
            : [
                {
                  key: "alert",
                  label: `Alertas: ${filter}`,
                  remove: () => setFilter("Todas"),
                },
              ]
        }
        clear={() => setFilter("Todas")}
      >
        <label>
          Mostrar alertas
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {["Todas", "Sin leer", "Alta prioridad", "Silenciadas"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
      </FilterPanel>
      {!rows.length ? (
        <Empty title="No hay alertas en esta vista" />
      ) : (
        <div className="alert-list">
          {rows.map((alert) => (
            <article
              key={alert.id}
              className={alert.read ? "alert-row" : "alert-row unread"}
            >
              <div className="alert-mark" aria-hidden="true">
                {alert.read ? <Check size={17} /> : "!"}
              </div>
              <div className="alert-body">
                <div className="inline-meta">
                  <Badge>{alert.urgency}</Badge>
                  <span>
                    {alert.kind} · {day(alert.at)}
                  </span>
                  {alert.mutedUntil && (
                    <span>Silenciada hasta {day(alert.mutedUntil)}</span>
                  )}
                </div>
                <h2>{alert.title}</h2>
                <p>{alert.reason}</p>
                <Link
                  to={`${context.base}/opportunities/${alert.opportunityId}`}
                >
                  Abrir expediente <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="row-actions">
                <button
                  onClick={() =>
                    mutation.mutate({
                      type: "alert.read",
                      id: alert.id,
                      values: { read: !alert.read },
                    })
                  }
                >
                  {alert.read ? "Marcar sin leer" : "Marcar leída"}
                </button>
                <button
                  onClick={() =>
                    alert.mutedUntil
                      ? mutation.mutate({
                          type: "alert.mute",
                          id: alert.id,
                          values: { until: "" },
                        })
                      : setDialog({
                          title: "Silenciar alerta temporalmente",
                          description:
                            alert.urgency === "Alta"
                              ? "Esta alerta es de alta prioridad. El evento seguirá disponible en el historial."
                              : "La alerta se reactivará en la fecha indicada.",
                          fields: [
                            {
                              name: "until",
                              label: "Reactivar el",
                              type: "date",
                            },
                          ],
                          schema: z.object({
                            until: z.iso
                              .date()
                              .refine(
                                (value) => value >= "2026-10-22",
                                "Selecciona una fecha posterior a la referencia de la demo.",
                              ),
                          }),
                          onSave: (values) =>
                            mutation.mutateAsync({
                              type: "alert.mute",
                              id: alert.id,
                              values,
                            }),
                        })
                  }
                >
                  {alert.mutedUntil ? "Reactivar" : "Silenciar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Feedback error={mutation.error} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
export function Sources({ context, data }: ScreenProps): ReactElement {
  const mutation = useCommand(context);
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  return (
    <section>
      <PageHeading
        title="Fuentes con acceso controlado"
        description="Colombia es el módulo inicial. Cada fuente conserva términos, programación y salud."
      />
      <Notice>
        En esta demostración todos los lotes proceden de fixtures. Activar un
        control no establece una conexión con SECOP.
      </Notice>
      <div className="source-list">
        {data.sources.map((source) => (
          <article className="panel source-panel" key={source.id}>
            <div className="source-logo" aria-hidden="true">
              {source.country === "Colombia"
                ? "CO"
                : source.country === "Chile"
                  ? "CL"
                  : "PE"}
            </div>
            <div className="source-summary">
              <div className="inline-meta">
                <h2>{source.name}</h2>
                <Badge>{source.status}</Badge>
              </div>
              <p>
                {source.country} ·{" "}
                {source.available
                  ? source.enabled
                    ? `Programación cada ${source.interval} minutos`
                    : "Monitoreo pausado"
                  : "Acceso y condiciones pendientes de validar"}
              </p>
              <small>
                Último lote: {day(source.lastRun)} · Términos:{" "}
                {source.termsVersion}
              </small>
              <div className="source-counters">
                <span>
                  <strong>{source.accepted}</strong> aceptados
                </span>
                <span>
                  <strong>{source.rejected}</strong> rechazados
                </span>
                <span>
                  <strong>{source.duplicates}</strong> duplicados
                </span>
              </div>
            </div>
            <div className="source-actions">
              {can(context, "source") ? (
                <>
                  <button
                    disabled={!source.available}
                    onClick={() =>
                      setDialog({
                        title: `Configurar ${source.name}`,
                        fields: [
                          {
                            name: "enabled",
                            label: "Monitoreo activo",
                            type: "checkbox",
                          },
                          {
                            name: "interval",
                            label: "Intervalo en minutos (15–1440)",
                            type: "number",
                          },
                          {
                            name: "termsVersion",
                            label: "Versión de términos revisada",
                          },
                          {
                            name: "authorized",
                            label: "Uso autorizado para la simulación",
                            type: "checkbox",
                          },
                        ],
                        initial: { ...source },
                        schema: z.object({
                          enabled: z.boolean(),
                          interval: z.coerce.number().int().min(15).max(1440),
                          termsVersion: required,
                          authorized: z.boolean(),
                        }),
                        onSave: (values) =>
                          mutation.mutateAsync({
                            type: "source.configure",
                            id: source.id,
                            values,
                          }),
                      })
                    }
                  >
                    <SlidersHorizontal size={16} aria-hidden="true" />{" "}
                    Configurar
                  </button>
                  <button
                    disabled={!source.available || mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        type: "source.run",
                        id: source.id,
                        values: {},
                      })
                    }
                  >
                    <RefreshCw size={16} aria-hidden="true" /> Simular lote
                  </button>
                </>
              ) : (
                <span className="small muted">
                  Consulta · configuración restringida
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="inline-actions">
        <Link to={context.base + "/operations"}>
          Ver lotes, fallos y reintentos{" "}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <Link to={context.base + "/profile/sourcepolicy"}>
          Políticas de uso de fuentes
        </Link>
      </div>
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
