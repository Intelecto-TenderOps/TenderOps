import { FilterPanel } from "./filters";
import { useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  ExternalLink,
  Link2,
  LockKeyhole,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { z } from "zod";
import { http } from "../../shared/api";
import { roleLabels } from "./fixtures";
import { can } from "./repository";
import { useCommand } from "./hooks";
import {
  Badge,
  Busy,
  DataTable,
  day,
  downloadText,
  Feedback,
  FormDialog,
  Notice,
  options,
  PageHeading,
  required,
  ServiceState,
  Stat,
} from "./ui";
import type { FormSpec } from "./ui";
import type { ScreenProps } from "./discovery";
import type { AuditEvent, WorkbenchContext } from "./types";

export function Dynamics({ context, data }: ScreenProps): ReactElement {
  const mutation = useCommand(context);
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const [selected, setSelected] = useState<string>(data.opportunities[0].id);
  const op = data.opportunities.find((item) => item.id === selected)!;
  const record = data.sync.find((item) => item.opportunityId === selected);
  const mapping = [
    {
      id: "1",
      source: "Objeto del proceso",
      destination: "Nombre de oportunidad",
      ownership: "TenderOps al crear; luego manual protegido",
      transformation: "Sin sobrescribir un nombre comercial manual",
    },
    {
      id: "2",
      source: "Identificador oficial del comprador",
      destination: "customerid (account/contact)",
      ownership: "Resolución humana autorizada",
      transformation: "Coincidencia exacta y selección ante ambigüedad",
    },
    {
      id: "3",
      source: "Presupuesto original",
      destination: "Moneda y valor estimado",
      ownership: "TenderOps según mapeo aprobado",
      transformation: "Decimal exacto + moneda; nulos no borran valores",
    },
    {
      id: "4",
      source: "Cierre del proceso",
      destination: "Fecha estimada de cierre",
      ownership: "Regla de propiedad por campo",
      transformation: "UTC y zona original separadas; If-Match",
    },
    {
      id: "5",
      source: "Decisión BID",
      destination: "Estado de integración",
      ownership: "Decisión humana en TenderOps",
      transformation: "No equivale a oportunidad ganada ni perdida",
    },
  ];
  return (
    <section>
      <PageHeading
        eyebrow="INTEGRACIÓN COMERCIAL"
        title="TenderOps y Dynamics, con reglas claras"
        description="Vínculos, propiedad de campos y conflictos que requieren una decisión."
      >
        {can(context, "commercial") && (
          <button
            onClick={() =>
              mutation.mutate({ type: "sync.reconcile", values: {} })
            }
          >
            <RefreshCw size={16} aria-hidden="true" /> Simular reconciliación
          </button>
        )}
      </PageHeading>
      <Notice>
        La demostración no llama a Dynamics ni crea oportunidades o tareas
        remotas. Los identificadores de esta vista son sintéticos.
      </Notice>
      <div className="table-filters">
        <label>
          Expediente comercial
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {data.opportunities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.reference} · {item.title}
              </option>
            ))}
          </select>
        </label>
        <Link to={`${context.base}/opportunities/${op.id}/decision`}>
          Revisar decisión del expediente
        </Link>
      </div>
      <div className="dossier-summary-grid">
        <section className="panel">
          <p className="eyebrow">CUENTA COMPRADORA</p>
          <h2>{op.account ?? "Cuenta pendiente de resolución"}</h2>
          <p className="body-copy">
            {op.buyer} · {op.buyerTaxId}
          </p>
          <p className="small muted">
            Un nombre similar no autoriza un enlace. La asociación se revisa
            mediante el identificador oficial del comprador.
          </p>
          {can(context, "commercial") && (
            <button
              onClick={() =>
                setDialog({
                  title: "Resolver cuenta del comprador",
                  description: `Comprador: ${op.buyer}. Identificador de ejemplo: ${op.buyerTaxId}. La selección no crea una cuenta real.`,
                  fields: [
                    {
                      name: "account",
                      label: "Cuenta verificada para la demostración",
                      type: "select",
                      options: options([
                        `Cuenta demo · ${op.buyer}`,
                        `Revisión manual · ${op.buyerTaxId}`,
                      ]),
                    },
                    {
                      name: "confirmation",
                      label:
                        "Confirmo que revisé el identificador del comprador",
                      type: "checkbox",
                    },
                  ],
                  schema: z.object({
                    account: required,
                    confirmation: z.literal(true, {
                      error: "Confirma la revisión del identificador.",
                    }),
                  }),
                  onSave: (values) =>
                    mutation.mutateAsync({
                      type: "sync.account",
                      opportunityId: op.id,
                      values,
                    }),
                })
              }
            >
              <Link2 size={16} aria-hidden="true" /> Resolver cuenta
            </button>
          )}
        </section>
        <section className="panel">
          <p className="eyebrow">VÍNCULO COMERCIAL</p>
          <h2>{record?.externalId ?? "Sin oportunidad vinculada"}</h2>
          <Badge>{record?.status ?? "Pendiente de BID y cuenta"}</Badge>
          <dl className="stacked-metadata">
            <div>
              <dt>Última sincronización de ejemplo</dt>
              <dd>{day(record?.lastSync ?? "")}</dd>
            </div>
            <div>
              <dt>Moneda</dt>
              <dd>{record?.currency ?? op.currency}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{record?.direction ?? "Por iniciar"}</dd>
            </div>
          </dl>
          {can(context, "commercial") && (
            <div className="inline-actions">
              <button
                className="primary"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    type: "sync.link",
                    opportunityId: op.id,
                    values: {},
                  })
                }
              >
                Simular vínculo idempotente
              </button>
              {record && (
                <button
                  onClick={() =>
                    setDialog({
                      title: "Registrar cierre comercial de ejemplo",
                      description:
                        "En una conexión real se deben usar las operaciones soportadas WinOpportunity/LoseOpportunity. El expediente y su decisión BID se conservan.",
                      fields: [
                        {
                          name: "outcome",
                          label: "Resultado comercial",
                          type: "select",
                          options: options(["Ganada", "Perdida"]),
                        },
                        {
                          name: "reason",
                          label: "Motivo del resultado",
                          type: "textarea",
                        },
                      ],
                      schema: z.object({
                        outcome: required,
                        reason: required.min(10),
                      }),
                      onSave: (values) =>
                        mutation.mutateAsync({
                          type: "sync.close",
                          opportunityId: op.id,
                          values,
                        }),
                    })
                  }
                >
                  Registrar cierre
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Conflictos de sincronización</h2>
          <span className="small muted">
            Los campos manuales conservan su protección
          </span>
        </div>
        <DataTable
          rows={data.sync.filter((item) => item.status === "Conflicto")}
          label="Conflictos con Dynamics"
          empty="No hay conflictos pendientes"
          columns={[
            {
              key: "record",
              label: "Registro / campo",
              render: (item) => (
                <>
                  <strong>{item.externalId}</strong>
                  <small className="cell-sub">{item.conflictField}</small>
                </>
              ),
            },
            {
              key: "local",
              label: "TenderOps",
              render: (item) => item.localValue,
            },
            {
              key: "remote",
              label: "Dynamics",
              render: (item) => item.remoteValue,
            },
            {
              key: "action",
              label: "Resolución",
              render: (item) =>
                can(context, "commercial") ? (
                  <button
                    onClick={() =>
                      setDialog({
                        title: "Resolver conflicto con revisión humana",
                        description: `Campos protegidos: ${item.manualFields.join(", ")}. No se ejecuta reparación masiva.`,
                        fields: [
                          {
                            name: "resolution",
                            label: "Política para este conflicto",
                            type: "select",
                            options: options([
                              "Conservar valor manual de Dynamics",
                              "Aplicar valor de TenderOps autorizado",
                            ]),
                          },
                          {
                            name: "confirmation",
                            label: "He revisado ambos valores",
                            type: "checkbox",
                          },
                        ],
                        schema: z.object({
                          resolution: required,
                          confirmation: z.literal(true, {
                            error: "Confirma la revisión.",
                          }),
                        }),
                        onSave: (values) =>
                          mutation.mutateAsync({
                            type: "sync.resolve",
                            id: item.id,
                            opportunityId: item.opportunityId,
                            values,
                          }),
                      })
                    }
                  >
                    Revisar conflicto
                  </button>
                ) : (
                  <span className="muted">Consulta</span>
                ),
            },
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Propiedad y mapeo de campos · v1 propuesta</h2>
          <LockKeyhole size={18} aria-hidden="true" />
        </div>
        <DataTable
          rows={mapping}
          label="Mapeo comercial"
          columns={[
            { key: "source", label: "Origen", render: (item) => item.source },
            {
              key: "destination",
              label: "Destino",
              render: (item) => item.destination,
            },
            {
              key: "owner",
              label: "Propiedad de escritura",
              render: (item) => item.ownership,
            },
            {
              key: "rule",
              label: "Regla",
              render: (item) => item.transformation,
            },
          ]}
        />
      </section>
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
export function Operations({ context, data }: ScreenProps): ReactElement {
  const [filter, setFilter] = useState<string>("Todos");
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const mutation = useCommand(context);
  const rows = data.jobs.filter(
    (job) => filter === "Todos" || job.status === filter,
  );
  return (
    <section>
      <PageHeading
        eyebrow="OPERACIÓN"
        title="Cada trabajo tiene un rastro"
        description="Consulta estado, intentos, correlación y resultados de los procesos asíncronos."
      />
      <div className="stats-row">
        <Stat
          label="En curso"
          value={
            data.jobs.filter((job) =>
              ["Pendiente", "En curso"].includes(job.status),
            ).length
          }
          detail="Con consulta periódica de estado"
        />
        <Stat
          label="Completados"
          value={data.jobs.filter((job) => job.status === "Completado").length}
          detail="Resultados disponibles en la demostración"
        />
        <Stat
          label="Fallos por revisar"
          value={data.jobs.filter((job) => job.status === "Fallido").length}
          detail="La causa determina si se permite reintentar"
        />
        <Stat
          label="Integraciones externas"
          value="Sin conectar"
          detail="No hay métricas reales de Azure en esta vista"
        />
      </div>
      <FilterPanel
        active={
          filter === "Todos"
            ? []
            : [
                {
                  key: "state",
                  label: `Estado: ${filter}`,
                  remove: () => setFilter("Todos"),
                },
              ]
        }
        clear={() => setFilter("Todos")}
      >
        <label>
          Estado del trabajo
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {["Todos", "Pendiente", "En curso", "Completado", "Fallido"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <p className="small muted">
          Los trabajos de demostración se procesan localmente mientras consultas
          su estado.
        </p>
      </FilterPanel>
      <DataTable
        rows={rows}
        label="Trabajos y reintentos"
        columns={[
          {
            key: "type",
            label: "Trabajo / correlación",
            sort: (job) => job.createdAt,
            render: (job) => (
              <>
                <strong>{job.type}</strong>
                <small className="cell-sub">
                  <code>{job.correlationId}</code>
                </small>
                <small>{day(job.createdAt)}</small>
              </>
            ),
          },
          {
            key: "status",
            label: "Estado",
            render: (job) => (
              <>
                <Badge>{job.status}</Badge>
                <progress
                  max={100}
                  value={job.progress}
                  aria-label={"Progreso de " + job.type}
                />
                <small>{job.progress}%</small>
              </>
            ),
          },
          { key: "attempt", label: "Intentos", render: (job) => job.attempts },
          {
            key: "error",
            label: "Causa / categoría",
            render: (job) => (
              <>
                {job.error || "Sin errores registrados"}
                <small className="cell-sub">
                  {job.status === "Fallido"
                    ? job.transient
                      ? "Transitorio · revisión y replay autorizado"
                      : "Permanente · corregir configuración"
                    : "Procesamiento de ejemplo"}
                </small>
              </>
            ),
          },
          {
            key: "actions",
            label: "Acciones",
            render: (job) => (
              <div className="row-actions">
                {job.opportunityId && (
                  <Link
                    to={`${context.base}/opportunities/${job.opportunityId}`}
                  >
                    Expediente
                  </Link>
                )}
                {job.status === "Completado" && job.result && (
                  <button
                    onClick={() =>
                      downloadText(
                        "DEMO-" + job.type + ".json",
                        job.result,
                        "application/json",
                      )
                    }
                  >
                    <Download size={14} aria-hidden="true" /> Resultado JSON
                  </button>
                )}
                {job.status === "Fallido" && can(context, "operations") && (
                  <button
                    disabled={!job.transient}
                    onClick={() =>
                      setDialog({
                        title: "Reintentar trabajo revisado",
                        description:
                          "Solo se permite replay de fallos transitorios. Los errores de permisos o validación exigen corregir su causa.",
                        fields: [
                          {
                            name: "confirmation",
                            label:
                              "Revisé la causa del fallo y autorizo el replay de prueba",
                            type: "checkbox",
                          },
                        ],
                        schema: z.object({
                          confirmation: z.literal(true, {
                            error: "Confirma la revisión.",
                          }),
                        }),
                        submitLabel: "Reintentar en la demo",
                        onSave: (values) =>
                          mutation.mutateAsync({
                            type: "job.retry",
                            id: job.id,
                            values,
                          }),
                      })
                    }
                  >
                    <RefreshCw size={14} aria-hidden="true" /> Reintentar
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
      <div className="dossier-summary-grid">
        <section className="panel">
          <p className="eyebrow">SALUD DE SERVICIOS</p>
          <h2>Conexiones verificables</h2>
          <ul className="connection-list">
            {[
              "Entra / sesión BFF",
              "Dataverse",
              "Blob / análisis de seguridad",
              "Service Bus / cola de fallos",
              "Extracción / proveedor de modelos",
              "Dynamics 365",
            ].map((name) => (
              <li key={name}>
                <span>{name}</span>
                <Badge>Sin validación real</Badge>
              </li>
            ))}
          </ul>
          <p className="small muted">
            La disponibilidad real deberá proceder de los servicios; el frontend
            no la deduce de una pantalla cargada.
          </p>
        </section>
        <section className="panel">
          <p className="eyebrow">CALIDAD Y DESPLIEGUES</p>
          <h2>La evidencia vive con cada versión</h2>
          <p className="body-copy">
            Consulta las pruebas y artefactos de la versión en GitHub. Las
            pruebas de frontend no demuestran una integración real con
            Dataverse.
          </p>
          <a
            className="secondary-link"
            href="https://github.com/Intelecto-TenderOps/TenderOps/actions"
            target="_blank"
            rel="noreferrer"
          >
            Abrir comprobaciones de GitHub{" "}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <dl className="stacked-metadata">
            <div>
              <dt>Versión de interfaz</dt>
              <dd>0.2.0 · frontend integral</dd>
            </div>
            <div>
              <dt>Promoción</dt>
              <dd>Dev → Test → Prod · revisión requerida</dd>
            </div>
            <div>
              <dt>Restauración y rollback</dt>
              <dd>Requieren ensayo operativo antes de producción</dd>
            </div>
          </dl>
        </section>
      </div>
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
export function Analytics({ context, data }: ScreenProps): ReactElement {
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const mutation = useCommand(context);
  const [source, setSource] = useState<string>("Todas");
  const [from, setFrom] = useState<string>("2026-10-01");
  const [until, setUntil] = useState<string>("2026-11-30");
  const rows = data.opportunities.filter(
    (op) =>
      (source === "Todas" || op.source === source) &&
      op.publishedAt.slice(0, 10) >= from &&
      (!until || op.publishedAt.slice(0, 10) <= until),
  );
  const stages = [
    "Descubierta",
    "Evaluación",
    "Decisión",
    "Preparación",
    "Presentada",
    "Cerrada",
  ];
  const max = Math.max(
    1,
    ...stages.map((stage) => rows.filter((op) => op.stage === stage).length),
  );
  const categories = [
    "Experiencia",
    "Financiero",
    "Jurídico",
    "Técnico",
    "Fechas",
    "Puntuación",
  ];
  const quality = categories.map((category, index) => ({
    id: category,
    category,
    reviewed: 12 + index,
    correct: 10 + index,
    pending: 2,
    source: "Conjunto sintético etiquetado · ejemplo",
  }));
  return (
    <section>
      <PageHeading
        eyebrow="ANÁLISIS Y GOBIERNO"
        title="Mide el proceso, revisa la evidencia"
        description="Separa el estado comercial, los eventos históricos y la calidad de las recomendaciones."
      />
      <Notice>
        Estas cifras se derivan del conjunto sintético. No representan desempeño
        comercial, precisión de IA ni objetivos de servicio medidos.
      </Notice>
      <FilterPanel
        active={[
          ...(source !== "Todas"
            ? [
                {
                  key: "source",
                  label: `Fuente: ${source}`,
                  remove: () => setSource("Todas"),
                },
              ]
            : []),
          ...(from
            ? [
                {
                  key: "from",
                  label: `Desde: ${from}`,
                  remove: () => setFrom(""),
                },
              ]
            : []),
          ...(until
            ? [
                {
                  key: "until",
                  label: `Hasta: ${until}`,
                  remove: () => setUntil(""),
                },
              ]
            : []),
        ]}
        clear={() => {
          setSource("Todas");
          setFrom("");
          setUntil("");
        }}
      >
        <label>
          Fuente
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option>Todas</option>
            <option>SECOP II</option>
          </select>
        </label>
        <label>
          Publicados desde
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={until}
            onChange={(event) => setUntil(event.target.value)}
          />
        </label>
      </FilterPanel>
      {from && until && from > until ? (
        <Notice tone="warning">
          La fecha inicial no puede superar la final.
        </Notice>
      ) : (
        <>
          <div className="stats-row">
            <Stat
              label="Expedientes del periodo"
              value={rows.length}
              detail="Segmentados por empresa y fuente"
            />
            <Stat
              label="Decisiones humanas"
              value={
                data.decisions.filter((item) =>
                  rows.some((op) => op.id === item.opportunityId),
                ).length
              }
              detail="Registros de comité, con versiones"
            />
            <Stat
              label="Cierres registrados"
              value={rows.filter((op) => op.stage === "Cerrada").length}
              detail="El cierre no prueba precisión de la evaluación"
            />
            <Stat
              label="Eventos disponibles"
              value={
                data.audit.filter(
                  (item) =>
                    !item.opportunityId ||
                    rows.some((op) => op.id === item.opportunityId),
                ).length
              }
              detail="Historial de la sesión de demostración"
            />
          </div>
          <div className="dossier-summary-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>Distribución actual de expedientes</h2>
                <Badge>Estado actual · v1</Badge>
              </div>
              <p className="small muted">
                Esta distribución no es una tasa de conversión histórica.
              </p>
              <div className="funnel-chart">
                {stages.map((stage, index) => (
                  <Link
                    to={`${context.base}/opportunities?stage=${encodeURIComponent(stage)}`}
                    key={stage}
                  >
                    <span>
                      0{index + 1} · {stage}
                    </span>
                    <div>
                      <span
                        style={{
                          width: `${(rows.filter((op) => op.stage === stage).length / max) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>
                      {rows.filter((op) => op.stage === stage).length}
                    </strong>
                  </Link>
                ))}
              </div>
            </section>
            <section className="panel">
              <h2>Eventos del embudo</h2>
              <p className="body-copy">
                Cada avance debe conservar actor, fecha y definición de etapa.
                Los eventos no se reconstruyen a partir del estado actual.
              </p>
              <dl className="stacked-metadata">
                <div>
                  <dt>Registros históricos de ejemplo</dt>
                  <dd>{data.audit.length}</dd>
                </div>
                <div>
                  <dt>Definición de etapas</dt>
                  <dd>Propuesta v1 · pendiente de aprobación comercial</dd>
                </div>
                <div>
                  <dt>Ventana de análisis</dt>
                  <dd>
                    {day(from)} — {day(until)}
                  </dd>
                </div>
              </dl>
              <Link to={context.base + "/audit"}>Consultar bitácora</Link>
            </section>
          </div>
        </>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Calidad de extracción y recomendación</h2>
          <Badge>Dataset de ejemplo</Badge>
        </div>
        <Notice>
          La aceptación de una recomendación, la calidad de sus citas y ganar
          una oportunidad son métricas distintas. Estos ejemplos no establecen
          causalidad.
        </Notice>
        <DataTable
          rows={quality}
          label="Conjunto de evaluación de ejemplo"
          columns={[
            {
              key: "category",
              label: "Categoría",
              render: (item) => item.category,
            },
            {
              key: "reviewed",
              label: "Casos etiquetados",
              render: (item) => item.reviewed,
            },
            {
              key: "correct",
              label: "Citas verificables (ejemplo)",
              render: (item) => item.correct,
            },
            {
              key: "pending",
              label: "Revisión pendiente",
              render: (item) => item.pending,
            },
            {
              key: "source",
              label: "Procedencia",
              render: (item) => item.source,
            },
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Objetivos de servicio</h2>
          <Badge>Propuestos · no medidos</Badge>
        </div>
        <div className="slo-grid">
          {data.serviceObjectives.map((item) => (
            <article key={item.id}>
              <h3>{item.name}</h3>
              <p>{item.metric}</p>
              <strong>{item.target}</strong>
              <small>
                {item.window} · {item.exclusions} · {item.status}
              </small>
              {can(context, "operations") && (
                <button
                  type="button"
                  onClick={() =>
                    setDialog({
                      title: `Proponer objetivo · ${item.name}`,
                      description:
                        "Esta propuesta no acredita cumplimiento del servicio.",
                      initial: {
                        target: item.target,
                        window: item.window,
                        exclusions: item.exclusions,
                      },
                      fields: [
                        { name: "target", label: "Objetivo" },
                        {
                          name: "window",
                          label: "Ventana de medición",
                        },
                        {
                          name: "exclusions",
                          label: "Exclusiones",
                          type: "textarea",
                        },
                      ],
                      schema: z.object({
                        target: z.string().trim().min(3),
                        window: z.string().trim().min(3),
                        exclusions: z.string().trim().min(3),
                      }),
                      onSave: async (values) => {
                        await mutation.mutateAsync({
                          type: "slo.save",
                          id: item.id,
                          values,
                        });
                      },
                    })
                  }
                >
                  Editar propuesta
                </button>
              )}
            </article>
          ))}
        </div>
        <Link to={context.base + "/settings?section=governance"}>
          Revisar parámetros de gobierno
        </Link>
      </section>
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
export function Settings({ context, data }: ScreenProps): ReactElement {
  const [tab, setTab] = useState<string>("Notificaciones");
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const mutation = useCommand(context);
  const preferences = data.preferences;
  return (
    <section>
      <PageHeading
        title="Un espacio de trabajo bajo control"
        description="Preferencias personales, retención, permisos y configuración de entorno."
      />
      <div className="segmented" aria-label="Secciones de configuración">
        {["Notificaciones", "Gobierno documental", "Seguridad", "Entorno"].map(
          (value) => (
            <button
              key={value}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {value}
            </button>
          ),
        )}
      </div>
      {tab === "Notificaciones" && (
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">TUS PREFERENCIAS</p>
              <h2>Notificaciones que respetan tu jornada</h2>
            </div>
            <button
              onClick={() =>
                setDialog({
                  title: "Configurar notificaciones",
                  description:
                    "Correo y Teams requieren un proveedor configurado. En la demo solo se guardan preferencias; no se envían mensajes.",
                  fields: [
                    {
                      name: "internal",
                      label: "Alertas internas",
                      type: "checkbox",
                    },
                    {
                      name: "email",
                      label: "Preferencia de correo",
                      type: "checkbox",
                    },
                    {
                      name: "teams",
                      label: "Preferencia de Teams",
                      type: "checkbox",
                    },
                    {
                      name: "quietStart",
                      label: "Inicio del horario silencioso",
                      type: "time",
                    },
                    {
                      name: "quietEnd",
                      label: "Fin del horario silencioso",
                      type: "time",
                    },
                    {
                      name: "timezone",
                      label: "Zona horaria",
                      type: "select",
                      options: options([
                        "America/Bogota",
                        "America/Lima",
                        "America/Santiago",
                      ]),
                    },
                    {
                      name: "warningDays",
                      label: "Aviso previo de vencimiento (días)",
                      type: "number",
                    },
                  ],
                  initial: { ...preferences },
                  schema: z.object({
                    internal: z.boolean(),
                    email: z.boolean(),
                    teams: z.boolean(),
                    quietStart: z.string(),
                    quietEnd: z.string(),
                    timezone: required,
                    warningDays: z.coerce.number().int().min(1).max(365),
                  }),
                  onSave: (values) =>
                    mutation.mutateAsync({ type: "preferences.save", values }),
                })
              }
            >
              <Settings2 size={16} aria-hidden="true" /> Editar preferencias
            </button>
          </div>
          <ul className="connection-list">
            {[
              ["Alertas internas", preferences.internal],
              ["Preferencia de correo", preferences.email],
              ["Preferencia de Teams", preferences.teams],
            ].map(([name, active]) => (
              <li key={String(name)}>
                <span>{name}</span>
                <Badge>{active ? "Activada" : "Desactivada"}</Badge>
              </li>
            ))}
          </ul>
          <dl className="stacked-metadata">
            <div>
              <dt>Horario silencioso</dt>
              <dd>
                {preferences.quietStart} — {preferences.quietEnd}
              </dd>
            </div>
            <div>
              <dt>Zona horaria</dt>
              <dd>{preferences.timezone}</dd>
            </div>
            <div>
              <dt>Vencimientos documentales</dt>
              <dd>Aviso {preferences.warningDays} días antes</dd>
            </div>
          </dl>
        </section>
      )}
      {tab === "Gobierno documental" && (
        <section className="panel settings-panel">
          <div className="panel-heading">
            <h2>Retención y conservación</h2>
            {can(context, "legal") && (
              <button
                onClick={() =>
                  setDialog({
                    title: "Preparar política de retención",
                    description:
                      "Introduce únicamente un plazo aprobado por tu organización. La demo conserva un borrador y no elimina archivos.",
                    fields: [
                      {
                        name: "retentionDays",
                        label:
                          "Días de retención aprobados (vacío si no están definidos)",
                        help: "No se propone un plazo legal por defecto.",
                      },
                      {
                        name: "legalHold",
                        label: "Aplicar conservación por hold a la empresa",
                        type: "checkbox",
                      },
                    ],
                    initial: {
                      retentionDays: preferences.retentionDays,
                      legalHold: preferences.legalHold,
                    },
                    schema: z.object({
                      retentionDays: z
                        .string()
                        .regex(
                          /^$|^[1-9]\d{0,3}$/,
                          "Usa un número de días positivo o deja el campo vacío.",
                        ),
                      legalHold: z.boolean(),
                    }),
                    submitLabel: "Guardar borrador de política",
                    onSave: (values) =>
                      mutation.mutateAsync({ type: "retention.save", values }),
                  })
                }
              >
                Editar borrador
              </button>
            )}
          </div>
          <Notice tone={preferences.legalHold ? "warning" : "info"}>
            {preferences.legalHold
              ? "Hold activo en la demostración: la conservación impide programar una purga."
              : "No se ejecutan purgas automáticas ni se eliminan originales desde esta interfaz."}
          </Notice>
          <dl className="stacked-metadata">
            <div>
              <dt>Plazo registrado</dt>
              <dd>
                {preferences.retentionDays
                  ? preferences.retentionDays + " días · borrador"
                  : "Sin política aprobada registrada"}
              </dd>
            </div>
            <div>
              <dt>Conservación por hold</dt>
              <dd>{preferences.legalHold ? "Activa" : "Inactiva"}</dd>
            </div>
            <div>
              <dt>Ámbito de la empresa</dt>
              <dd>
                Colombia · documentos del expediente y referencias empresariales
              </dd>
            </div>
            <div>
              <dt>Backups, auditoría e índices</dt>
              <dd>
                Requieren política coordinada y aprobación antes de habilitar
                purga
              </dd>
            </div>
          </dl>
          <Link to={context.base + "/profile/evidence"}>
            Consultar evidencias empresariales
          </Link>
        </section>
      )}
      {tab === "Seguridad" && (
        <section className="panel">
          <h2>Funciones y separación de responsabilidades</h2>
          <p className="body-copy">
            La vista de demostración permite recorrer funciones. En una sesión
            real, las membresías y permisos provienen del servidor.
          </p>
          <DataTable
            rows={Object.entries(roleLabels).map(([id, name]) => ({
              id,
              name,
            }))}
            label="Matriz de funciones"
            columns={[
              {
                key: "role",
                label: "Función",
                render: (item) => <strong>{item.name}</strong>,
              },
              {
                key: "actions",
                label: "Responsabilidad",
                render: (item) =>
                  ({
                    Administrator: "Empresa, usuarios, equipos y operación",
                    Analyst: "Expedientes, requisitos y revisión técnica",
                    Commercial:
                      "Cuenta, oportunidad y sincronización comercial",
                    Legal: "Revisión jurídica y políticas de uso/retención",
                    Financial: "Cortes y revisión financiera",
                    Approver: "Decisión BID/NO_BID, excepciones y líneas base",
                    Auditor: "Consulta de evidencias y auditoría",
                  })[item.id],
              },
              {
                key: "boundary",
                label: "Control",
                render: () => "Permiso validado por operación y empresa",
              },
            ]}
          />
          <div className="inline-actions">
            <Link to={context.base + "/profile/membership"}>
              Administrar membresías
            </Link>
            <Link to={context.base + "/profile/team"}>Administrar equipos</Link>
            <Link to={context.base + "/audit"}>Consultar auditoría</Link>
          </div>
        </section>
      )}
      {tab === "Entorno" && (
        <section className="panel settings-panel">
          <p className="eyebrow">CONFIGURACIÓN EXTERNA</p>
          <h2>Credenciales fuera de la interfaz</h2>
          <dl className="stacked-metadata">
            <div>
              <dt>Entorno mostrado</dt>
              <dd>Dev · demostración</dd>
            </div>
            <div>
              <dt>Sesión</dt>
              <dd>Demostración independiente de Entra</dd>
            </div>
            <div>
              <dt>Conexiones externas</dt>
              <dd>Por configurar y verificar</dd>
            </div>
            <div>
              <dt>Secretos y certificados</dt>
              <dd>
                Variables seguras y Key Vault; no se introducen en formularios
                del navegador
              </dd>
            </div>
            <div>
              <dt>Próxima promoción</dt>
              <dd>
                Revisión de configuración, solución Dataverse y pruebas en Test
              </dd>
            </div>
          </dl>
          <Link to={context.base + "/operations"}>
            Ver operación y comprobaciones de versión
          </Link>
        </section>
      )}
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
export function Audit({ context, data }: ScreenProps): ReactElement {
  return can(context, "audit") ? (
    <AuditTable context={context} rows={data.audit} />
  ) : (
    <section>
      <PageHeading title="Auditoría restringida" />
      <Notice>
        Tu función no tiene permiso para consultar la bitácora de esta empresa.
      </Notice>
    </section>
  );
}
function AuditTable({
  context,
  rows,
}: {
  context: WorkbenchContext;
  rows: AuditEvent[];
}): ReactElement {
  const [query, setQuery] = useState<string>("");
  const filtered = rows.filter((row) =>
    `${row.action} ${row.actor} ${row.correlationId}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section>
      <PageHeading
        eyebrow="TRAZABILIDAD"
        title="Quién cambió qué, y cuándo"
        description="Bitácora de solo consulta. La auditoría funcional no equivale a inmutabilidad criptográfica."
      >
        <LockKeyhole size={22} aria-hidden="true" />
      </PageHeading>
      <FilterPanel
        active={
          query
            ? [
                {
                  key: "query",
                  label: `Búsqueda: ${query}`,
                  remove: () => setQuery(""),
                },
              ]
            : []
        }
        clear={() => setQuery("")}
      >
        <label className="audit-search">
          Buscar acción, actor o correlación
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar eventos"
          />
        </label>
      </FilterPanel>
      <DataTable
        rows={filtered}
        label="Eventos de auditoría"
        columns={[
          {
            key: "at",
            label: "Fecha",
            sort: (row) => row.at,
            render: (row) => day(row.at),
          },
          {
            key: "action",
            label: "Acción",
            render: (row) => (
              <>
                <strong>{row.action}</strong>
                <small className="cell-sub">{row.detail}</small>
              </>
            ),
          },
          { key: "actor", label: "Actor", render: (row) => row.actor },
          {
            key: "correlation",
            label: "Correlación",
            render: (row) => <code>{row.correlationId}</code>,
          },
          {
            key: "record",
            label: "Registro",
            render: (row) =>
              row.opportunityId ? (
                <Link
                  to={`${context.base}/opportunities/${row.opportunityId}/history`}
                >
                  Expediente
                </Link>
              ) : (
                <span>Empresa</span>
              ),
          },
        ]}
      />
    </section>
  );
}
interface BackendAudit {
  id: string;
  companyId: string;
  entityId: string;
  actor: string;
  action: string;
  occurredAt: string;
  correlationId: string;
}
export function LiveAudit({
  context,
}: {
  context: WorkbenchContext;
}): ReactElement {
  const [offset, setOffset] = useState<number>(0);
  const query = useQuery({
    queryKey: ["audit", context.companyId, offset],
    queryFn: async ({ signal }): Promise<BackendAudit[]> =>
      (
        await http.get<BackendAudit[]>(
          `/v1/companies/${context.companyId}/audit?offset=${offset}&limit=25`,
          { signal },
        )
      ).data,
    retry: false,
    enabled: context.permissions.includes("audit.read"),
  });
  if (!context.permissions.includes("audit.read"))
    return (
      <Notice>
        Tu función no tiene acceso a la auditoría de esta empresa.
      </Notice>
    );
  if (query.isPending) return <Busy />;
  if (query.isError)
    return (
      <ServiceState
        context={context}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  return (
    <>
      <AuditTable
        context={context}
        rows={query.data.map((row) => ({
          id: row.id,
          opportunityId: "",
          action: row.action,
          actor: row.actor,
          at: row.occurredAt,
          detail: `Recurso ${row.entityId}`,
          correlationId: row.correlationId,
        }))}
      />
      <div className="inline-actions">
        <button
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 25))}
        >
          Anterior lote
        </button>
        <button
          disabled={query.data.length < 25}
          onClick={() => setOffset(offset + 25)}
        >
          Siguiente lote
        </button>
      </div>
    </>
  );
}
