import { useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Download,
  LockKeyhole,
  Plus,
  Send,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";
import { blockers, can, referenceDate } from "./repository";
import { useCommand } from "./hooks";
import {
  Badge,
  DataTable,
  day,
  downloadText,
  Feedback,
  FormDialog,
  Notice,
  options,
  required,
} from "./ui";
import type { FormSpec } from "./ui";
import type { DossierProps } from "./dossier";
import type { ScreenProps } from "./discovery";
import type { TaskRecord } from "./types";

export function DecisionScreen({
  context,
  data,
  opportunity: op,
}: DossierProps): ReactElement {
  const mutation = useCommand(context);
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const pending = blockers(data, op.id);
  const decisions = data.decisions.filter(
    (item) => item.opportunityId === op.id,
  );
  const approvals = data.approvals.filter(
    (item) => item.opportunityId === op.id,
  );
  const waivers = data.waivers.filter((item) => item.opportunityId === op.id);
  const baselines = data.baselines.filter(
    (item) => item.opportunityId === op.id,
  );
  const roles: Record<string, string> = {
    Jurídica: "Legal",
    Financiera: "Financial",
    Técnica: "Analyst",
  };
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h2>Comité de decisión</h2>
          <p>
            La decisión pertenece a personas autorizadas y conserva el análisis
            revisado.
          </p>
        </div>
        {can(context, "edit") && (
          <button
            onClick={() =>
              mutation.mutate({
                type: "approval.request",
                opportunityId: op.id,
                values: {},
              })
            }
          >
            <Send size={16} aria-hidden="true" /> Solicitar aprobaciones
          </button>
        )}
      </div>
      <div className="decision-grid">
        <section className="panel">
          <p className="eyebrow">CONDICIONES PARA PARTICIPAR</p>
          <h2>
            {pending.length
              ? `${pending.length} puntos por resolver antes de BID`
              : "Condiciones de revisión resueltas"}
          </h2>
          {pending.length ? (
            <ul className="blocker-list">
              {pending.map((value, index) => (
                <li key={value + index}>
                  <span aria-hidden="true">!</span>
                  {value}
                </li>
              ))}
            </ul>
          ) : (
            <p className="success-message">
              <Check size={18} aria-hidden="true" /> Requisitos y aprobaciones
              vigentes revisados.
            </p>
          )}
          <Link to={`${context.base}/opportunities/${op.id}/requirements`}>
            Volver a los requisitos y su evidencia
          </Link>
        </section>
        <section className="panel decision-action">
          <p className="eyebrow">DECISIÓN HUMANA</p>
          <h2>
            {decisions.at(-1)?.result ?? "Aún no hay decisión registrada"}
          </h2>
          <p>
            Una nueva decisión crea una versión. El historial anterior se
            conserva.
          </p>
          <Badge>Análisis v{op.analysisVersion}</Badge>
          {can(context, "decide") ? (
            <button
              className="primary"
              onClick={() =>
                setDialog({
                  title: "Registrar decisión del comité",
                  description:
                    "BID exige resolver los bloqueos y obtener las aprobaciones vigentes. NO_BID conserva el motivo de descarte y no crea una oportunidad comercial.",
                  fields: [
                    {
                      name: "result",
                      label: "Decisión",
                      type: "select",
                      options: options(["NO_BID", "BID"]),
                    },
                    {
                      name: "reason",
                      label: "Motivo documentado",
                      type: "textarea",
                    },
                  ],
                  schema: z.object({
                    result: required,
                    reason: required.min(
                      10,
                      "Explica el motivo con al menos diez caracteres.",
                    ),
                  }),
                  submitLabel: "Registrar decisión en la demo",
                  onSave: (values) =>
                    mutation.mutateAsync({
                      type: "decision.record",
                      opportunityId: op.id,
                      values: { ...values, version: op.version },
                    }),
                })
              }
            >
              Registrar decisión
            </button>
          ) : (
            <Notice>
              Tu función puede consultar. La decisión requiere la función
              Aprobador.
            </Notice>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Aprobaciones por disciplina</h2>
          <span className="small muted">
            Se invalidan cuando cambia el análisis afectado
          </span>
        </div>
        <div className="approval-grid">
          {approvals.map((approval) => (
            <article className="approval-item" key={approval.id}>
              <span className="approval-icon" aria-hidden="true">
                <ShieldCheck size={20} />
              </span>
              <h3>{approval.discipline}</h3>
              <Badge>{approval.status}</Badge>
              <p>Análisis v{approval.analysisVersion}</p>
              {approval.actor && (
                <small>
                  {approval.actor} · {day(approval.date)}
                </small>
              )}
              {approval.comment && <p className="small">{approval.comment}</p>}
              {context.role === roles[approval.discipline] && (
                <button
                  disabled={op.stale}
                  onClick={() =>
                    setDialog({
                      title: `Revisión ${approval.discipline.toLowerCase()}`,
                      fields: [
                        {
                          name: "status",
                          label: "Resultado de revisión",
                          type: "select",
                          options: options(["Aprobada", "Devuelta"]),
                        },
                        {
                          name: "comment",
                          label: "Comentario de la disciplina",
                          type: "textarea",
                        },
                      ],
                      schema: z.object({ status: required, comment: required }),
                      onSave: (values) =>
                        mutation.mutateAsync({
                          type: "approval.respond",
                          id: approval.id,
                          opportunityId: op.id,
                          values,
                        }),
                    })
                  }
                >
                  Registrar revisión
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
      <div className="dossier-summary-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Excepciones autorizadas</h2>
            {can(context, "decide") && (
              <button
                onClick={() =>
                  setDialog({
                    title: "Autorizar una excepción",
                    description:
                      "La excepción conserva requisito, responsable, justificación y vencimiento. No modifica la evidencia ni elimina el incumplimiento original.",
                    fields: [
                      {
                        name: "requirementId",
                        label: "Requisito",
                        type: "select",
                        options: data.requirements
                          .filter(
                            (req) =>
                              req.opportunityId === op.id && req.mandatory,
                          )
                          .map((req) => ({ value: req.id, label: req.title })),
                      },
                      {
                        name: "reason",
                        label: "Justificación de la excepción",
                        type: "textarea",
                      },
                      { name: "until", label: "Válida hasta", type: "date" },
                    ],
                    schema: z.object({
                      requirementId: required,
                      reason: required.min(10),
                      until: z.iso.date(),
                    }),
                    onSave: (values) =>
                      mutation.mutateAsync({
                        type: "waiver.create",
                        opportunityId: op.id,
                        values,
                      }),
                  })
                }
              >
                Añadir excepción
              </button>
            )}
          </div>
          {waivers.length ? (
            <ul className="compact-list">
              {waivers.map((waiver) => (
                <li key={waiver.id}>
                  <div>
                    <strong>
                      {
                        data.requirements.find(
                          (req) => req.id === waiver.requirementId,
                        )?.title
                      }
                    </strong>
                    <p>{waiver.reason}</p>
                    <small>
                      {waiver.actor} · vence {day(waiver.until)}
                    </small>
                    <Badge>
                      {waiver.until >= referenceDate ? "Vigente" : "Vencida"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-inline">
              No hay excepciones. Los bloqueos mantienen su efecto.
            </p>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Líneas base congeladas</h2>
            {can(context, "decide") && (
              <button
                disabled={op.stale}
                onClick={() =>
                  setDialog({
                    title: "Congelar línea base",
                    description:
                      "El manifiesto conservará las versiones exactas de perfil, reglas, análisis y documentos. Los análisis posteriores no lo modificarán.",
                    fields: [
                      {
                        name: "confirm",
                        label: "Confirmo las versiones que estoy revisando",
                        type: "checkbox",
                      },
                    ],
                    schema: z.object({
                      confirm: z.literal(true, {
                        error: "Confirma las versiones.",
                      }),
                    }),
                    submitLabel: "Congelar manifiesto",
                    onSave: (values) =>
                      mutation.mutateAsync({
                        type: "baseline.freeze",
                        opportunityId: op.id,
                        values,
                      }),
                  })
                }
              >
                <LockKeyhole size={15} aria-hidden="true" /> Congelar
              </button>
            )}
          </div>
          {baselines.length ? (
            baselines.map((baseline) => (
              <details className="baseline" key={baseline.id}>
                <summary>
                  Análisis v{baseline.analysisVersion} · {day(baseline.at)}
                </summary>
                <p>
                  {baseline.actor} · {baseline.documents.length} versiones
                  documentales
                </p>
                <pre>{JSON.stringify(baseline, null, 2)}</pre>
                <button
                  onClick={() =>
                    downloadText(
                      "DEMO-linea-base.json",
                      JSON.stringify(baseline, null, 2),
                      "application/json",
                    )
                  }
                >
                  <Download size={15} aria-hidden="true" /> Descargar manifiesto
                </button>
              </details>
            ))
          ) : (
            <p className="empty-inline">
              Todavía no se ha congelado una línea base.
            </p>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>Decisiones registradas</h2>
        {decisions.length ? (
          <ol className="decision-history">
            {decisions.map((decision) => (
              <li key={decision.id}>
                <Badge>{decision.result}</Badge>
                <div>
                  <strong>
                    Decisión v{decision.version} · análisis v
                    {decision.analysisVersion}
                  </strong>
                  <p>{decision.reason}</p>
                  <small>
                    {decision.actor} · {day(decision.date)}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-inline">
            El comité aún no ha registrado una decisión.
          </p>
        )}
      </section>
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

export function PreparationScreen({
  context,
  data,
  opportunity: op,
}: DossierProps): ReactElement {
  const mutation = useCommand(context);
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const [state, setState] = useState<string>("Todos");
  const all = data.checklist.filter((item) => item.opportunityId === op.id);
  const rows = all.filter((item) => state === "Todos" || item.state === state);
  const complete = all.filter((item) => item.state === "Completado").length;
  const documents = data.documents.filter(
    (doc) => doc.opportunityId === op.id && doc.status === "Available",
  );
  const jobs = data.jobs.filter(
    (job) => job.opportunityId === op.id && job.type === "Paquete de propuesta",
  );
  const latestBaseline = data.baselines
    .filter((item) => item.opportunityId === op.id)
    .at(-1);
  const differences = latestBaseline
    ? data.documents.filter(
        (doc) =>
          doc.opportunityId === op.id &&
          doc.status === "Available" &&
          !latestBaseline.documents.some(
            (ref) => ref.id === doc.id && ref.version === doc.version,
          ),
      ).length
    : null;
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h2>Prepara una propuesta trazable</h2>
          <p>
            Cada entregable enlaza requisito, responsable, evidencia y tarea.
          </p>
        </div>
        {can(context, "edit") && (
          <button
            onClick={() =>
              mutation.mutate({
                type: "checklist.generate",
                opportunityId: op.id,
                values: {},
              })
            }
          >
            <Plus size={16} aria-hidden="true" /> Actualizar desde requisitos
          </button>
        )}
      </div>
      <div className="readiness-panel">
        <div>
          <p className="eyebrow">COMPLETITUD DOCUMENTAL</p>
          <h2>
            {all.length && complete === all.length
              ? "Lista para revisar el paquete"
              : "Faltan entregables por completar"}
          </h2>
          <p>
            {complete} de {all.length} entregables completados. Una falta de
            soporte no equivale por sí sola a incumplimiento material.
          </p>
        </div>
        <div className="readiness-meter">
          <strong>
            {all.length ? Math.round((complete / all.length) * 100) : 0}%
          </strong>
          <div className="progress-track">
            <span
              style={{
                width: `${all.length ? (complete / all.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
      {op.stale && (
        <Notice tone="warning">
          Hay cambios posteriores al análisis. Revisa el impacto de la adenda;
          el trabajo completado se conserva.
        </Notice>
      )}
      <div className="table-filters">
        <label>
          Estado del entregable
          <select
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            {["Todos", "Pendiente", "En curso", "Bloqueado", "Completado"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <span>{all.length - complete} pendientes de cierre</span>
      </div>
      <DataTable
        rows={rows}
        label="Checklist de propuesta"
        columns={[
          {
            key: "title",
            label: "Entregable / requisito",
            render: (item) => (
              <>
                <strong>{item.title}</strong>
                <small className="cell-sub">
                  {item.dependencyId
                    ? "Depende de: " +
                      (all.find((row) => row.id === item.dependencyId)?.title ??
                        "Registro no disponible")
                    : "Sin dependencia previa"}
                </small>
                <Link
                  to={`${context.base}/opportunities/${op.id}/requirements`}
                >
                  Consultar requisito
                </Link>
              </>
            ),
          },
          {
            key: "owner",
            label: "Responsable / fecha",
            sort: (item) => item.due,
            render: (item) => (
              <>
                <strong>{item.owner}</strong>
                <small className="cell-sub">
                  {day(item.due)}
                  {item.manualDate ? " · Fecha manual protegida" : ""}
                </small>
              </>
            ),
          },
          {
            key: "status",
            label: "Estado",
            render: (item) => <Badge>{item.state}</Badge>,
          },
          {
            key: "evidence",
            label: "Evidencia",
            render: (item) =>
              item.evidenceId ? (
                <Link
                  to={`${context.base}/opportunities/${op.id}/documents?doc=${item.evidenceId}`}
                >
                  Abrir soporte
                </Link>
              ) : (
                <span className="muted">Pendiente de soporte</span>
              ),
          },
          {
            key: "edit",
            label: "Acciones",
            render: (item) =>
              can(context, "edit") ? (
                <button
                  onClick={() =>
                    setDialog({
                      title: "Actualizar entregable",
                      description:
                        "Para completar se exige evidencia disponible y que las dependencias estén resueltas.",
                      fields: [
                        {
                          name: "state",
                          label: "Estado",
                          type: "select",
                          options: options([
                            "Pendiente",
                            "En curso",
                            "Bloqueado",
                            "Completado",
                          ]),
                        },
                        {
                          name: "owner",
                          label: "Responsable",
                          type: "select",
                          options: options(
                            data.members.map((member) => member.name),
                          ),
                        },
                        { name: "due", label: "Fecha objetivo", type: "date" },
                        {
                          name: "manualDate",
                          label: "Proteger esta fecha como ajuste manual",
                          type: "checkbox",
                        },
                        {
                          name: "evidenceId",
                          label: "Evidencia del expediente",
                          type: "select",
                          options: [
                            { value: "", label: "Seleccionar soporte" },
                            ...documents.map((doc) => ({
                              value: doc.id,
                              label: `${doc.name} · v${doc.version}`,
                            })),
                          ],
                        },
                        {
                          name: "note",
                          label: "Nota de preparación",
                          type: "textarea",
                        },
                      ],
                      initial: { ...item },
                      schema: z.object({
                        state: required,
                        owner: required,
                        due: z.iso.date(),
                        manualDate: z.boolean(),
                        evidenceId: z.string(),
                        note: required,
                      }),
                      onSave: (values) =>
                        mutation.mutateAsync({
                          type: "checklist.update",
                          id: item.id,
                          opportunityId: op.id,
                          values,
                        }),
                    })
                  }
                >
                  Actualizar
                </button>
              ) : (
                <span className="muted">Consulta</span>
              ),
          },
        ]}
      />
      <div className="dossier-summary-grid">
        <section className="panel">
          <p className="eyebrow">PAQUETE DE TRABAJO</p>
          <h2>Versiones explícitas, entrega revisable</h2>
          <p className="body-copy">
            La demostración genera un manifiesto JSON de los archivos
            disponibles. Los originales no se incluyen ni se presenta una oferta
            en un portal.
          </p>
          {can(context, "edit") && (
            <button
              className="primary"
              disabled={
                mutation.isPending ||
                all.length === 0 ||
                complete !== all.length
              }
              onClick={() =>
                mutation.mutate({
                  type: "package.generate",
                  opportunityId: op.id,
                  values: {},
                })
              }
            >
              <Download size={16} aria-hidden="true" /> Generar manifiesto de
              prueba
            </button>
          )}
          {complete !== all.length && (
            <p className="field-help">
              Completa los {all.length - complete} entregables pendientes para
              habilitar la generación.
            </p>
          )}
          <ul className="compact-list">
            {jobs.map((job) => (
              <li key={job.id}>
                <div>
                  <Badge>{job.status}</Badge>
                  <p>
                    Correlación: <code>{job.correlationId}</code>
                  </p>
                </div>
                {job.status === "Completado" && (
                  <button
                    onClick={() =>
                      downloadText(
                        "DEMO-paquete-manifiesto.json",
                        job.result,
                        "application/json",
                      )
                    }
                  >
                    Descargar JSON
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Link to={context.base + "/operations"}>
            Consultar trabajos y manifiestos
          </Link>
        </section>
        <section className="panel">
          <p className="eyebrow">AUDITORÍA DEL PAQUETE</p>
          <h2>Antes de cerrar la preparación</h2>
          <ul className="check-list">
            <li>
              <Badge>
                {complete === all.length && all.length
                  ? "Completo"
                  : "Pendiente"}
              </Badge>{" "}
              Todos los entregables cuentan con soporte
            </li>
            <li>
              <Badge>{latestBaseline ? "Registrada" : "Pendiente"}</Badge> Línea
              base del análisis
            </li>
            <li>
              <Badge>
                {differences === null
                  ? "Sin comparación"
                  : differences
                    ? "Revisión requerida"
                    : "Sin diferencias"}
              </Badge>{" "}
              {differences === null
                ? "Congela una línea base para comparar"
                : `${differences} versiones posteriores a la línea base`}
            </li>
            <li>
              <Badge>
                {data.documents.some(
                  (doc) =>
                    doc.opportunityId === op.id && doc.status !== "Available",
                )
                  ? "Excluidos"
                  : "Revisados"}
              </Badge>{" "}
              Archivos en cuarentena fuera del manifiesto
            </li>
          </ul>
          <Link to={`${context.base}/opportunities/${op.id}/decision`}>
            Revisar decisión y línea base{" "}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      </div>
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}
export function Tasks({ context, data }: ScreenProps): ReactElement {
  const [view, setView] = useState<string>("Lista");
  const [owner, setOwner] = useState<string>("Todos");
  const [state, setState] = useState<string>("Todos");
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const mutation = useCommand(context);
  const rows = data.tasks.filter(
    (task) =>
      (owner === "Todos" || task.owner === owner) &&
      (state === "Todos" || task.state === state),
  );
  function edit(task?: TaskRecord): void {
    const initialOp = task?.opportunityId ?? data.opportunities[0].id;
    setDialog({
      title: task ? "Actualizar tarea" : "Crear tarea",
      description:
        "La fecha manual se protege ante recálculos. Las tareas de checklist exigen evidencia disponible para completarse.",
      fields: [
        {
          name: "opportunityId",
          label: "Expediente",
          type: "select",
          options: data.opportunities
            .filter((op) => !task || op.id === task.opportunityId)
            .map((op) => ({
              value: op.id,
              label: `${op.reference} · ${op.title}`,
            })),
        },
        { name: "title", label: "Asunto" },
        {
          name: "owner",
          label: "Asignar a",
          type: "select",
          options: options(data.members.map((member) => member.name)),
        },
        { name: "due", label: "Vencimiento", type: "date" },
        {
          name: "manualDate",
          label: "Mantener fecha manual",
          type: "checkbox",
        },
        {
          name: "state",
          label: "Estado",
          type: "select",
          options: options([
            "Pendiente",
            "En curso",
            "Bloqueado",
            "Completado",
          ]),
        },
        {
          name: "priority",
          label: "Prioridad",
          type: "select",
          options: options(["Alta", "Media", "Baja"]),
        },
        {
          name: "evidenceId",
          label: "Evidencia (solo del expediente seleccionado)",
          type: "select",
          options: [
            { value: "", label: "Sin soporte adjunto" },
            ...data.documents
              .filter((doc) => doc.status === "Available")
              .map((doc) => ({
                value: doc.id,
                label: `${data.opportunities.find((op) => op.id === doc.opportunityId)?.reference} · ${doc.name}`,
              })),
          ],
        },
        { name: "note", label: "Nota de avance o cierre", type: "textarea" },
      ],
      initial: {
        opportunityId: initialOp,
        state: "Pendiente",
        priority: "Media",
        manualDate: false,
        ...task,
      },
      schema: z.object({
        opportunityId: required,
        title: required,
        owner: required,
        due: z.iso.date(),
        manualDate: z.boolean(),
        state: required,
        priority: required,
        evidenceId: z.string(),
        note: z.string(),
      }),
      onSave: (values) =>
        mutation.mutateAsync({
          type: "task.save",
          id: task?.id,
          opportunityId: String(values.opportunityId),
          values,
        }),
    });
  }
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EJECUCIÓN Y EQUIPO</p>
          <h1>Tareas que hacen avanzar la propuesta</h1>
          <p>
            Responsables, fechas, dependencias y evidencia en un solo lugar.
          </p>
        </div>
        {can(context, "edit") && (
          <button className="primary" onClick={() => edit()}>
            <Plus size={17} aria-hidden="true" /> Crear tarea
          </button>
        )}
      </div>
      <div className="workload-strip">
        {data.members.map((member) => {
          const count = data.tasks.filter(
            (task) => task.owner === member.name && task.state !== "Completado",
          ).length;
          return (
            <button
              key={member.id}
              aria-pressed={owner === member.name}
              onClick={() =>
                setOwner(owner === member.name ? "Todos" : member.name)
              }
            >
              <span className="avatar" aria-hidden="true">
                {member.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span>
                <strong>{member.name}</strong>
                <small>{count} tareas activas</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="results-toolbar">
        <div className="table-filters">
          <label>
            Responsable
            <select
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
            >
              {["Todos", ...data.members.map((member) => member.name)].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Estado
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
            >
              {[
                "Todos",
                "Pendiente",
                "En curso",
                "Bloqueado",
                "Completado",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="segmented">
          {["Lista", "Tablero"].map((value) => (
            <button
              key={value}
              aria-pressed={view === value}
              onClick={() => setView(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      {view === "Lista" ? (
        <DataTable
          rows={rows}
          label="Tareas del equipo"
          columns={[
            {
              key: "title",
              label: "Tarea / expediente",
              render: (task) => (
                <>
                  <strong>{task.title}</strong>
                  <Link
                    className="cell-sub"
                    to={`${context.base}/opportunities/${task.opportunityId}/preparation`}
                  >
                    {
                      data.opportunities.find(
                        (op) => op.id === task.opportunityId,
                      )?.reference
                    }
                  </Link>
                </>
              ),
            },
            {
              key: "owner",
              label: "Responsable",
              sort: (task) => task.owner,
              render: (task) => task.owner,
            },
            {
              key: "due",
              label: "Vencimiento",
              sort: (task) => task.due,
              render: (task) => (
                <>
                  {day(task.due)}
                  <small className="cell-sub">
                    {task.manualDate
                      ? "Fecha manual protegida"
                      : "Fecha de referencia del hito"}
                  </small>
                </>
              ),
            },
            {
              key: "priority",
              label: "Prioridad",
              render: (task) => <Badge>{task.priority}</Badge>,
            },
            {
              key: "state",
              label: "Estado",
              render: (task) => <Badge>{task.state}</Badge>,
            },
            {
              key: "actions",
              label: "Acciones",
              render: (task) =>
                can(context, "edit") ? (
                  <button onClick={() => edit(task)}>Actualizar</button>
                ) : (
                  <span className="muted">Consulta</span>
                ),
            },
          ]}
        />
      ) : (
        <div
          className="kanban"
          role="region"
          aria-label="Tablero de tareas"
          tabIndex={0}
        >
          {["Pendiente", "En curso", "Bloqueado", "Completado"].map(
            (status) => (
              <section key={status}>
                <h2>
                  {status}
                  <span>
                    {rows.filter((task) => task.state === status).length}
                  </span>
                </h2>
                {rows
                  .filter((task) => task.state === status)
                  .map((task) => (
                    <article key={task.id}>
                      <Badge>{task.priority}</Badge>
                      <h3>{task.title}</h3>
                      <p>{task.owner}</p>
                      <time>{day(task.due)}</time>
                      {can(context, "edit") && (
                        <button onClick={() => edit(task)}>
                          Actualizar tarea
                        </button>
                      )}
                    </article>
                  ))}
              </section>
            ),
          )}
        </div>
      )}
      <Feedback error={mutation.error} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
