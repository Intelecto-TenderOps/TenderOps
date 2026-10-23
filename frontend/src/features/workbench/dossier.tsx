import { FilterPanel } from "./filters";
import { Fragment, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileCheck2,
  FileText,
  LockKeyhole,
  MessageSquare,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import { z } from "zod";
import { can } from "./repository";
import { useCommand } from "./hooks";
import {
  Badge,
  DataTable,
  day,
  downloadText,
  Empty,
  Feedback,
  FormDialog,
  money,
  Notice,
  options,
  required,
} from "./ui";
import type { FormSpec } from "./ui";
import type { ScreenProps } from "./discovery";
import type { Opportunity } from "./types";
import { DecisionScreen, PreparationScreen } from "./preparation";

export interface DossierProps extends ScreenProps {
  opportunity: Opportunity;
}
export function Dossier({ context, data }: ScreenProps): ReactElement {
  const { id } = useParams();
  const opportunity = data.opportunities.find((op) => op.id === id);
  if (!opportunity)
    return (
      <section>
        <Empty title="Expediente no disponible en esta empresa">
          Comprueba la empresa seleccionada o vuelve a las oportunidades
          autorizadas.
        </Empty>
        <Link to={context.base + "/opportunities"}>Volver a oportunidades</Link>
      </section>
    );
  const root = `${context.base}/opportunities/${opportunity.id}`;
  const props = { context, data, opportunity };
  return (
    <section className="dossier">
      <Link className="back-link" to={context.base + "/opportunities"}>
        <ArrowLeft size={15} aria-hidden="true" /> Oportunidades
      </Link>
      <div className="dossier-heading">
        <div>
          <div className="inline-meta">
            <span className="overline">{opportunity.reference}</span>
            <Badge>{opportunity.stage}</Badge>
            {opportunity.stale && (
              <Badge tone="warning">Análisis desactualizado</Badge>
            )}
          </div>
          <h1 tabIndex={-1}>{opportunity.title}</h1>
          <p>
            {opportunity.buyer} <span aria-hidden="true">·</span>{" "}
            {opportunity.region} <span aria-hidden="true">·</span>{" "}
            {opportunity.modality}
          </p>
        </div>
        <div className="dossier-close">
          <span>CIERRE DEL PROCESO</span>
          <strong>{day(opportunity.closesAt)}</strong>
          <small>15:00 · {opportunity.timezone}</small>
        </div>
      </div>
      <nav className="dossier-tabs" aria-label="Secciones del expediente">
        {[
          ["", "Resumen"],
          ["documents", "Documentos"],
          ["requirements", "Requisitos"],
          ["evaluation", "Evaluación"],
          ["decision", "Decisión"],
          ["preparation", "Preparación"],
          ["history", "Historial"],
        ].map(([path, label]) => (
          <NavLink
            end={path === ""}
            key={path}
            to={root + (path ? "/" + path : "")}
          >
            {label}
            {path === "documents" && (
              <span>
                {
                  data.documents.filter((doc) => doc.opportunityId === id)
                    .length
                }
              </span>
            )}
            {path === "requirements" && (
              <span>
                {
                  data.requirements.filter((req) => req.opportunityId === id)
                    .length
                }
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Summary {...props} />} />
        <Route path="documents" element={<Documents {...props} />} />
        <Route path="requirements" element={<Requirements {...props} />} />
        <Route path="evaluation" element={<Evaluation {...props} />} />
        <Route path="decision" element={<DecisionScreen {...props} />} />
        <Route path="preparation" element={<PreparationScreen {...props} />} />
        <Route path="history" element={<History {...props} />} />
        <Route path="*" element={<Empty title="Esta sección no existe" />} />
      </Routes>
    </section>
  );
}
function Summary({
  context,
  data,
  opportunity: op,
}: DossierProps): ReactElement {
  const mutation = useCommand(context);
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const comments = data.comments.filter((item) => item.opportunityId === op.id);
  const escalations = data.escalations.filter(
    (item) => item.opportunityId === op.id,
  );
  return (
    <>
      <div className="dossier-summary-grid">
        <section className="panel">
          <p className="eyebrow">CONTEXTO DEL PROCESO</p>
          <h2>Un expediente, todas las referencias</h2>
          <p className="body-copy">{op.description}</p>
          <dl className="metadata-grid">
            <div>
              <dt>Presupuesto original</dt>
              <dd className="large-value">{money(op.amount, op.currency)}</dd>
            </div>
            <div>
              <dt>Fuente y país</dt>
              <dd>{op.source} · Colombia</dd>
            </div>
            <div>
              <dt>Identificación del comprador</dt>
              <dd>{op.buyerTaxId}</dd>
            </div>
            <div>
              <dt>Fecha de publicación</dt>
              <dd>{day(op.publishedAt)}</dd>
            </div>
            <div>
              <dt>Responsable del análisis</dt>
              <dd>{op.owner}</dd>
            </div>
            <div>
              <dt>Versión del expediente</dt>
              <dd>
                v{op.version} · análisis v{op.analysisVersion}
              </dd>
            </div>
          </dl>
          <div className="tag-list">
            {op.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="inline-actions">
            {can(context, "edit") && (
              <>
                <button
                  onClick={() =>
                    setDialog({
                      title: "Asignar responsable",
                      fields: [
                        {
                          name: "owner",
                          label: "Persona autorizada",
                          type: "select",
                          options: options(
                            data.members.map((member) => member.name),
                          ),
                        },
                      ],
                      initial: { owner: op.owner },
                      schema: z.object({ owner: required }),
                      onSave: (values) =>
                        mutation.mutateAsync({
                          type: "owner",
                          opportunityId: op.id,
                          values: { ...values, version: op.version },
                        }),
                    })
                  }
                >
                  Cambiar responsable
                </button>
                <button
                  onClick={() =>
                    setDialog({
                      title: "Registrar interés preliminar",
                      description:
                        "Esta clasificación no equivale a una decisión BID ni crea una oportunidad comercial.",
                      fields: [
                        {
                          name: "triage",
                          label: "Clasificación",
                          type: "select",
                          options: options([
                            "Por revisar",
                            "Interesada",
                            "Descartada",
                          ]),
                        },
                        { name: "reason", label: "Motivo", type: "textarea" },
                      ],
                      initial: { triage: op.triage, reason: op.triageReason },
                      schema: z.object({ triage: required, reason: required }),
                      onSave: (values) =>
                        mutation.mutateAsync({
                          type: "triage",
                          opportunityId: op.id,
                          values: { ...values, version: op.version },
                        }),
                    })
                  }
                >
                  Clasificar interés
                </button>
              </>
            )}
            <Badge>{op.triage}</Badge>
          </div>
          {op.triageReason && (
            <p className="field-help">Motivo registrado: {op.triageReason}</p>
          )}
        </section>
        <section className="panel recommendation-panel">
          <p className="eyebrow">PUNTO DE PARTIDA</p>
          <h2>{op.recommendation}</h2>
          <div className="score-display">
            <strong>
              {op.fit === null ? "—" : op.fit}
              <small>{op.fit === null ? "" : "%"}</small>
            </strong>
            <div>
              Encaje de ejemplo
              <br />
              <span>
                Confianza:{" "}
                {op.confidence === null ? "desconocida" : op.confidence + "%"}
              </span>
            </div>
          </div>
          <Notice tone="warning">
            La recomendación orienta la revisión. Los bloqueos y datos
            desconocidos requieren atención humana.
          </Notice>
          <Link
            className="primary"
            to={`${context.base}/opportunities/${op.id}/evaluation`}
          >
            Revisar evaluación <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to={`${context.base}/opportunities/${op.id}/requirements`}>
            Ver matriz y evidencia
          </Link>
        </section>
      </div>
      <div className="dossier-summary-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Conversación del equipo</h2>
            <MessageSquare size={19} aria-hidden="true" />
          </div>
          {comments.length ? (
            <ol className="comment-list">
              {comments.map((comment) => (
                <li key={comment.id}>
                  <strong>{comment.author}</strong>
                  <time>{day(comment.at)}</time>
                  <p>{comment.text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-inline">
              Aún no hay comentarios. Comparte contexto o menciona a una persona
              del equipo.
            </p>
          )}
          {can(context, "comment") && (
            <button
              onClick={() =>
                setDialog({
                  title: "Añadir comentario",
                  description:
                    "Solo personas autorizadas de esta empresa pueden consultar la conversación. Los comentarios se conservan en el historial.",
                  fields: [
                    {
                      name: "text",
                      label: "Comentario",
                      type: "textarea",
                      help:
                        "Colaboradores: " +
                        data.members
                          .map((member) => "@" + member.name)
                          .join(", "),
                    },
                  ],
                  schema: z.object({ text: required.max(2000) }),
                  submitLabel: "Publicar comentario en la demo",
                  onSave: (values) =>
                    mutation.mutateAsync({
                      type: "comment.add",
                      opportunityId: op.id,
                      values,
                    }),
                })
              }
            >
              <Plus size={16} aria-hidden="true" /> Añadir comentario
            </button>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Conflictos y escalaciones</h2>
            {can(context, "comment") && (
              <button
                onClick={() =>
                  setDialog({
                    title: "Escalar una revisión",
                    fields: [
                      {
                        name: "title",
                        label: "Situación que requiere revisión",
                        type: "textarea",
                      },
                      {
                        name: "severity",
                        label: "Severidad",
                        type: "select",
                        options: options(["Alta", "Media", "Baja"]),
                      },
                      {
                        name: "owner",
                        label: "Responsable",
                        type: "select",
                        options: options(
                          data.members.map((member) => member.name),
                        ),
                      },
                      {
                        name: "due",
                        label: "Resolver antes del",
                        type: "date",
                      },
                    ],
                    schema: z.object({
                      title: required,
                      severity: required,
                      owner: required,
                      due: z.iso.date(),
                    }),
                    onSave: (values) =>
                      mutation.mutateAsync({
                        type: "escalation.create",
                        opportunityId: op.id,
                        values,
                      }),
                  })
                }
              >
                Escalar
              </button>
            )}
          </div>
          {escalations.length ? (
            <ul className="compact-list">
              {escalations.map((item) => (
                <li key={item.id}>
                  <div>
                    <Badge>{item.severity}</Badge>
                    <strong>{item.title}</strong>
                    <p>
                      {item.owner} · {day(item.due)} · {item.status}
                    </p>
                    {item.resolution && <p>{item.resolution}</p>}
                  </div>
                  {item.status === "Abierta" && can(context, "edit") && (
                    <button
                      onClick={() =>
                        setDialog({
                          title: "Resolver escalación",
                          fields: [
                            {
                              name: "resolution",
                              label: "Resolución documentada",
                              type: "textarea",
                            },
                          ],
                          schema: z.object({ resolution: required.min(10) }),
                          onSave: (values) =>
                            mutation.mutateAsync({
                              type: "escalation.resolve",
                              id: item.id,
                              opportunityId: op.id,
                              values,
                            }),
                        })
                      }
                    >
                      Resolver
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-inline">
              No hay escalaciones registradas para este expediente.
            </p>
          )}
        </section>
      </div>
      <Feedback error={mutation.error} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}
function Documents({
  context,
  data,
  opportunity: op,
}: DossierProps): ReactElement {
  const [params, setParams] = useSearchParams();
  const rows = data.documents.filter((doc) => doc.opportunityId === op.id);
  const selected = rows.find((doc) => doc.id === params.get("doc")) ?? rows[0];
  const citation = data.requirements.find(
    (req) => req.id === params.get("cite") && req.opportunityId === op.id,
  );
  const mutation = useCommand(context);
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  async function upload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (
      file.size > 20 * 1024 * 1024 ||
      !/\.(pdf|docx|xlsx|png|jpe?g)$/i.test(file.name)
    ) {
      setUploadError("Selecciona PDF, DOCX, XLSX o imagen de hasta 20 MB.");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const magic = String.fromCharCode(...bytes.slice(0, 5));
    const valid = /\.pdf$/i.test(file.name)
      ? magic === "%PDF-"
      : /\.(docx|xlsx)$/i.test(file.name)
        ? bytes[0] === 80 && bytes[1] === 75
        : /\.png$/i.test(file.name)
          ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78
          : bytes[0] === 255 && bytes[1] === 216;
    if (!valid) {
      setUploadError(
        "La firma del archivo no coincide con el formato declarado.",
      );
      return;
    }
    setUploadError("");
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    mutation.mutate({
      type: "document.upload",
      opportunityId: op.id,
      values: { name: file.name, size: file.size, hash },
    });
  }
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h2>Originales, versiones y adendas</h2>
          <p>La versión anterior siempre conserva su hash y su revisión.</p>
        </div>
        {can(context, "edit") && (
          <label className="upload-button">
            <Upload size={16} aria-hidden="true" /> Añadir archivo de prueba
            <input
              className="sr-only"
              type="file"
              aria-label="Añadir archivo de prueba"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
              onChange={(event) => void upload(event)}
            />
          </label>
        )}
      </div>
      <Notice>
        Los archivos añadidos se registran en cuarentena. La demo no ejecuta
        antivirus, OCR ni carga binarios a un servicio externo.
      </Notice>
      {uploadError && (
        <p role="alert" className="error">
          {uploadError}
        </p>
      )}
      <div className="document-layout">
        <section className="panel no-padding">
          <DataTable
            rows={rows}
            pageSize={6}
            label="Documentos del expediente"
            columns={[
              {
                key: "name",
                label: "Documento",
                render: (doc) => (
                  <button
                    className="document-link"
                    aria-pressed={selected?.id === doc.id}
                    onClick={() => setParams({ doc: doc.id })}
                  >
                    <FileText size={18} aria-hidden="true" />
                    <span>
                      <strong>{doc.name}</strong>
                      <small>
                        v{doc.version} · {doc.size}
                      </small>
                    </span>
                  </button>
                ),
              },
              {
                key: "status",
                label: "Disponibilidad",
                render: (doc) => (
                  <>
                    <Badge>
                      {
                        {
                          Available: "Disponible",
                          Quarantined: "Cuarentena",
                          Scanning: "Inspección",
                          Rejected: "Rechazado",
                        }[doc.status]
                      }
                    </Badge>
                    <small className="cell-sub">{doc.review}</small>
                  </>
                ),
              },
            ]}
          />
        </section>
        {selected && (
          <section className="panel document-preview">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">VERSIÓN {selected.version}</p>
                <h2>{selected.name}</h2>
              </div>
              <FileCheck2 size={20} aria-hidden="true" />
            </div>
            {selected.status !== "Available" ? (
              <div className="locked-document">
                <LockKeyhole size={30} aria-hidden="true" />
                <h3>Archivo restringido</h3>
                <p>
                  El contenido y la descarga solo se habilitan después del
                  circuito de seguridad.
                </p>
                <Badge>{selected.status}</Badge>
              </div>
            ) : (
              <>
                {citation && (
                  <Notice
                    tone={
                      selected.content.includes(citation.quote)
                        ? "info"
                        : "warning"
                    }
                  >
                    {selected.content.includes(citation.quote)
                      ? `Cita localizada: ${citation.locator}`
                      : "La cita no se ha verificado en este contenido. Requiere revisión manual; no se inventa un salto de página."}
                  </Notice>
                )}
                <p className="small muted">
                  Texto sintético de ejemplo ·{" "}
                  {selected.locator || "Sin localizador"}
                </p>
                <pre className="document-text">
                  {citation && selected.content.includes(citation.quote)
                    ? selected.content
                        .split(citation.quote)
                        .map((part, index) => (
                          <Fragment key={index}>
                            {index > 0 && <mark>{citation.quote}</mark>}
                            {part}
                          </Fragment>
                        ))
                    : selected.content}
                </pre>
                <div className="inline-actions">
                  <button
                    onClick={() =>
                      downloadText(
                        "DEMO-" + selected.name + ".txt",
                        selected.content,
                      )
                    }
                  >
                    <Download size={16} aria-hidden="true" /> Descargar texto de
                    ejemplo
                  </button>
                  {can(context, "edit") && (
                    <>
                      <button
                        onClick={() =>
                          setDialog({
                            title: "Registrar revisión documental",
                            fields: [
                              {
                                name: "review",
                                label: "Resultado",
                                type: "select",
                                options: options(["Revisado", "Devuelto"]),
                              },
                              {
                                name: "comment",
                                label: "Comentario de revisión",
                                type: "textarea",
                              },
                            ],
                            schema: z.object({
                              review: required,
                              comment: required,
                            }),
                            onSave: (values) =>
                              mutation.mutateAsync({
                                type: "document.review",
                                id: selected.id,
                                opportunityId: op.id,
                                values,
                              }),
                          })
                        }
                      >
                        Registrar revisión
                      </button>
                      <button
                        onClick={() =>
                          setDialog({
                            title: "Simular una adenda",
                            description:
                              "Crea una versión nueva y conserva la anterior. El análisis quedará desactualizado y las aprobaciones requerirán nueva revisión.",
                            fields: [
                              {
                                name: "confirm",
                                label: "Confirmo que deseo simular el cambio",
                                type: "checkbox",
                              },
                            ],
                            schema: z.object({
                              confirm: z.literal(true, {
                                error: "Confirma el cambio.",
                              }),
                            }),
                            submitLabel: "Crear versión de prueba",
                            onSave: (values) =>
                              mutation.mutateAsync({
                                type: "document.adenda",
                                id: selected.id,
                                opportunityId: op.id,
                                values,
                              }),
                          })
                        }
                      >
                        Simular adenda
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            <dl className="document-provenance">
              <div>
                <dt>Motor de extracción</dt>
                <dd>{selected.engine}</dd>
              </div>
              <div>
                <dt>Confianza de ejemplo</dt>
                <dd>
                  {selected.confidence === null
                    ? "Sin extraer"
                    : selected.confidence + "%"}
                </dd>
              </div>
              <div>
                <dt>SHA-256</dt>
                <dd>
                  <code>{selected.hash}</code>
                </dd>
              </div>
              {selected.supersedes && (
                <div>
                  <dt>Sustituye a</dt>
                  <dd>
                    <button
                      onClick={() => setParams({ doc: selected.supersedes! })}
                    >
                      Abrir versión anterior
                    </button>
                  </dd>
                </div>
              )}
            </dl>
            {selected.reviewer && (
              <p className="small">
                {selected.review} por {selected.reviewer}. {selected.comment}
              </p>
            )}
          </section>
        )}
      </div>
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}
function Requirements({
  context,
  data,
  opportunity: op,
}: DossierProps): ReactElement {
  const [category, setCategory] = useState<string>("Todas");
  const [status, setStatus] = useState<string>("Todos");
  const [mandatory, setMandatory] = useState<boolean>(false);
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const mutation = useCommand(context);
  const all = data.requirements.filter((req) => req.opportunityId === op.id);
  const rows = all.filter(
    (req) =>
      (category === "Todas" || req.category === category) &&
      (status === "Todos" || req.status === status) &&
      (!mandatory || req.mandatory),
  );
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h2>Matriz de cumplimiento</h2>
          <p>
            {all.length} requisitos · análisis v{op.analysisVersion} ·{" "}
            {
              all.filter((req) => req.mandatory && req.status === "No cumple")
                .length
            }{" "}
            bloqueos materiales
          </p>
        </div>
        <button
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              type: "matrix.export",
              opportunityId: op.id,
              values: {},
            })
          }
        >
          <Download size={16} aria-hidden="true" /> Exportar matriz de prueba
        </button>
      </div>
      {op.stale && (
        <Notice tone="warning">
          Existe una adenda posterior al análisis. Reevalúa antes de utilizar la
          matriz para una decisión.
        </Notice>
      )}
      <div className="matrix-summary">
        {[
          "Cumple",
          "No cumple",
          "Pendiente de evidencia",
          "Indeterminado",
          "No aplica",
        ].map((value) => (
          <button
            key={value}
            aria-pressed={status === value}
            onClick={() => setStatus(status === value ? "Todos" : value)}
          >
            <strong>{all.filter((req) => req.status === value).length}</strong>
            <span>{value}</span>
          </button>
        ))}
      </div>
      <FilterPanel
        active={[
          ...(category !== "Todas"
            ? [
                {
                  key: "category",
                  label: `Categoría: ${category}`,
                  remove: () => setCategory("Todas"),
                },
              ]
            : []),
          ...(status !== "Todos"
            ? [
                {
                  key: "status",
                  label: `Estado: ${status}`,
                  remove: () => setStatus("Todos"),
                },
              ]
            : []),
          ...(mandatory
            ? [
                {
                  key: "mandatory",
                  label: "Solo obligatorios",
                  remove: () => setMandatory(false),
                },
              ]
            : []),
        ]}
        clear={() => {
          setCategory("Todas");
          setStatus("Todos");
          setMandatory(false);
        }}
      >
        <label>
          Categoría
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {["Todas", ...new Set(all.map((req) => req.category))].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Estado
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {[
              "Todos",
              "Cumple",
              "No cumple",
              "Pendiente de evidencia",
              "Indeterminado",
              "No aplica",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={mandatory}
            onChange={(event) => setMandatory(event.target.checked)}
          />{" "}
          Solo obligatorios
        </label>
        <span>
          {rows.length} visibles de {all.length}
        </span>
      </FilterPanel>
      <DataTable
        rows={rows}
        label="Matriz de requisitos"
        columns={[
          {
            key: "title",
            label: "Requisito",
            render: (req) => (
              <>
                <strong>{req.title}</strong>
                <small className="cell-sub">
                  {req.category} · {req.mandatory ? "Obligatorio" : "Puntuable"}
                </small>
              </>
            ),
          },
          {
            key: "status",
            label: "Cumplimiento",
            sort: (req) => req.status,
            render: (req) => <Badge>{req.status}</Badge>,
          },
          {
            key: "source",
            label: "Fuente verificable",
            render: (req) => (
              <div className="citation-cell">
                <q>{req.quote}</q>
                <Link
                  to={`${context.base}/opportunities/${op.id}/documents?doc=${req.documentId}&cite=${req.id}`}
                >
                  {req.locator} · v{req.documentVersion}{" "}
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>
            ),
          },
          {
            key: "action",
            label: "Evidencia / acción",
            render: (req) => (
              <>
                <strong className="small">
                  {req.evidence || "Evidencia pendiente"}
                </strong>
                <p className="small muted">{req.action}</p>
                <small>{req.owner}</small>
              </>
            ),
          },
          {
            key: "review",
            label: "Revisión",
            render: (req) =>
              can(context, "edit") ? (
                <button
                  onClick={() =>
                    setDialog({
                      title: "Revisar requisito",
                      description:
                        "El estado expresa la revisión humana y debe conservar su evidencia y siguiente acción.",
                      fields: [
                        {
                          name: "status",
                          label: "Resultado",
                          type: "select",
                          options: options([
                            "Cumple",
                            "No cumple",
                            "Pendiente de evidencia",
                            "Indeterminado",
                            "No aplica",
                          ]),
                        },
                        {
                          name: "evidence",
                          label: "Evidencia o justificación",
                          type: "textarea",
                        },
                        {
                          name: "action",
                          label: "Siguiente acción",
                          type: "textarea",
                        },
                      ],
                      initial: {
                        status: req.status,
                        evidence: req.evidence,
                        action: req.action,
                      },
                      schema: z.object({
                        status: required,
                        evidence: required,
                        action: required,
                      }),
                      onSave: (values) =>
                        mutation.mutateAsync({
                          type: "requirement.review",
                          id: req.id,
                          opportunityId: op.id,
                          values,
                        }),
                    })
                  }
                >
                  Revisar
                </button>
              ) : (
                <span className="muted">Consulta</span>
              ),
          },
        ]}
      />
      <div className="inline-actions">
        <Link to={context.base + "/operations"}>
          Ver estado de exportaciones
        </Link>
        <Link to={`${context.base}/opportunities/${op.id}/evaluation`}>
          Ver evaluación y fórmulas
        </Link>
      </div>
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}
function Evaluation({
  context,
  data,
  opportunity: op,
}: DossierProps): ReactElement {
  const mutation = useCommand(context);
  const rows = data.requirements.filter((req) => req.opportunityId === op.id);
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h2>Una recomendación que se puede revisar</h2>
          <p>
            Encaje, confianza, bloqueos y puntajes conservan significados
            distintos.
          </p>
        </div>
        {can(context, "edit") && (
          <button
            className="primary"
            disabled={
              mutation.isPending ||
              data.jobs.some(
                (job) =>
                  job.opportunityId === op.id &&
                  job.type === "Reevaluación" &&
                  ["Pendiente", "En curso"].includes(job.status),
              )
            }
            onClick={() =>
              mutation.mutate({
                type: "analysis.run",
                opportunityId: op.id,
                values: {},
              })
            }
          >
            <RefreshCw size={16} aria-hidden="true" /> Simular reevaluación
          </button>
        )}
      </div>
      <Notice>
        Los resultados de esta vista son ejemplos estructurados. No se ha
        ejecutado un modelo de IA ni validado una evaluación real.
      </Notice>
      {op.stale && (
        <Notice tone="warning">
          Análisis desactualizado por adenda. Las decisiones previas permanecen
          en el historial.
        </Notice>
      )}
      <div className="evaluation-grid">
        <section className="panel recommendation-panel">
          <p className="eyebrow">ANÁLISIS V{op.analysisVersion}</p>
          <h2>{op.recommendation}</h2>
          <div className="score-display">
            <strong>
              {op.fit ?? "—"}
              <small>{op.fit === null ? "" : "%"}</small>
            </strong>
            <span>
              Encaje de ejemplo
              <br />
              Confianza{" "}
              {op.confidence === null ? "desconocida" : op.confidence + "%"}
            </span>
          </div>
          <dl className="stacked-metadata">
            <div>
              <dt>Bloqueos materiales</dt>
              <dd>
                {
                  rows.filter(
                    (req) => req.mandatory && req.status === "No cumple",
                  ).length
                }
              </dd>
            </div>
            <div>
              <dt>Datos indeterminados</dt>
              <dd>
                {rows.filter((req) => req.status === "Indeterminado").length}
              </dd>
            </div>
            <div>
              <dt>Requisitos sin evidencia</dt>
              <dd>{rows.filter((req) => !req.evidence).length}</dd>
            </div>
          </dl>
          <Link
            to={`${context.base}/opportunities/${op.id}/decision`}
            className="primary"
          >
            Ir al comité <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
        <section className="panel">
          <h2>Factores y evidencia</h2>
          <ul className="factor-list">
            {rows.map((req) => (
              <li key={req.id}>
                <Badge>{req.status}</Badge>
                <div>
                  <strong>{req.title}</strong>
                  <p>{req.action}</p>
                  <Link
                    to={`${context.base}/opportunities/${op.id}/documents?doc=${req.documentId}&cite=${req.id}`}
                  >
                    Comprobar cita y versión
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="dossier-summary-grid">
        <section className="panel">
          <p className="eyebrow">CÁLCULO FINANCIERO</p>
          <h2>Liquidez: activos corrientes / pasivos corrientes</h2>
          <dl className="stacked-metadata">
            <div>
              <dt>Periodo exigido</dt>
              <dd>Cierre de 2025</dd>
            </div>
            <div>
              <dt>Corte aprobado elegible</dt>
              <dd>Sin dato conectado</dd>
            </div>
            <div>
              <dt>Operandos</dt>
              <dd>
                {can(context, "finance")
                  ? "Pendientes de un corte aprobado del periodo exigido"
                  : "Acceso a cifras restringido por función"}
              </dd>
            </div>
            <div>
              <dt>Resultado</dt>
              <dd>
                <Badge>Indeterminado</Badge>
              </dd>
            </div>
          </dl>
          <p className="small muted">
            Sin operandos válidos, con periodos distintos o denominador cero no
            se presenta un cálculo definitivo.
          </p>
        </section>
        <section className="panel">
          <p className="eyebrow">PUNTUACIÓN Y PROCEDENCIA</p>
          <h2>Lo calculado y lo que falta conocer</h2>
          {rows
            .filter((req) => req.scoreKind !== "Desconocido")
            .map((req) => (
              <div className="score-row" key={req.id}>
                <span>{req.title}</span>
                <strong>{req.score}</strong>
                <Badge>{req.scoreKind}</Badge>
              </div>
            ))}
          <p className="small muted">
            Los criterios desconocidos no se incluyen como cero en un total.
          </p>
          <dl className="stacked-metadata">
            <div>
              <dt>Deployment / prompt</dt>
              <dd>Fixture de frontend / ejemplo-v1</dd>
            </div>
            <div>
              <dt>Reglas / perfil</dt>
              <dd>Referencia de prueba v1 / v1</dd>
            </div>
            <div>
              <dt>Originales citados</dt>
              <dd>
                {
                  data.documents.filter(
                    (doc) =>
                      doc.opportunityId === op.id && doc.status === "Available",
                  ).length
                }{" "}
                versiones disponibles
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      <Link to={context.base + "/operations"}>
        Consultar trabajos de reevaluación
      </Link>
    </>
  );
}
function History({ data, opportunity: op }: DossierProps): ReactElement {
  const events = data.audit
    .filter((item) => item.opportunityId === op.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <section className="panel">
      <div className="section-toolbar">
        <div>
          <h2>La historia del expediente</h2>
          <p>Eventos de solo consulta con actor, fecha y correlación.</p>
        </div>
        <LockKeyhole size={20} aria-hidden="true" />
      </div>
      <ol className="timeline">
        {events.map((event) => (
          <li key={event.id}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <time>{day(event.at)}</time>
              <h3>{event.action}</h3>
              <p>{event.detail}</p>
              <small>
                {event.actor} · <code>{event.correlationId}</code>
              </small>
            </div>
          </li>
        ))}
      </ol>
      {!events.length && <Empty title="Sin eventos registrados" />}
    </section>
  );
}
