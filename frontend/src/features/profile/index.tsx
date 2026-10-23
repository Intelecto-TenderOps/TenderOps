import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Check, Pencil, X } from "lucide-react";
import { commandHeaders, failure, http } from "../../shared/api";
import { definitions } from "./schema";
import type { Definition } from "./schema";
export { definitions } from "./schema";

export interface Resource {
  id: string;
  companyId: string;
  kind: string;
  version: number;
  data: Record<string, unknown>;
}
export interface ProfilePage {
  items: Resource[];
  hasMore: boolean;
  offset: number;
  limit: number;
}
export interface ProfileTransport {
  list: (
    companyId: string,
    kind: string,
    offset: number,
    signal?: AbortSignal,
  ) => Promise<ProfilePage>;
  save: (
    companyId: string,
    kind: string,
    data: Record<string, unknown>,
    row?: Resource,
  ) => Promise<unknown>;
  approve: (companyId: string, kind: string, row: Resource) => Promise<unknown>;
}
interface ProfileProps {
  companyId: string;
  kind: string;
  permissions: string[];
  csrf: string;
  transport?: ProfileTransport;
}

export function Profile({
  companyId,
  kind,
  permissions,
  csrf,
  transport,
}: ProfileProps): ReactElement {
  const definition =
    definitions.find((item) => item.kind === kind) ?? definitions[0];
  const [offset, setOffset] = useState<number>(0);
  const [editing, setEditing] = useState<Resource | "new" | null>(null);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["profile", companyId, kind, offset],
    queryFn: async ({ signal }): Promise<ProfilePage> =>
      transport
        ? transport.list(companyId, kind, offset, signal)
        : (
            await http.get<ProfilePage>(
              `/v1/companies/${companyId}/${kind}?offset=${offset}&limit=10`,
              { signal },
            )
          ).data,
  });
  const approve = useMutation({
    mutationFn: async (row: Resource) =>
      transport
        ? transport.approve(companyId, kind, row)
        : http.post(
            `/v1/companies/${companyId}/${kind}/${row.id}/approve`,
            {},
            { headers: commandHeaders(csrf, `"${row.version}"`) },
          ),
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: ["profile", companyId, kind] }),
  });
  const canEdit = permissions.includes(definition.permission);
  return (
    <section aria-labelledby="profile-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PERFIL EMPRESARIAL</p>
          <h1 id="profile-heading">{definition.title}</h1>
          <p>{definition.description}</p>
        </div>
        {canEdit && kind !== "company" && (
          <button className="primary" onClick={() => setEditing("new")}>
            <Plus size={18} aria-hidden="true" /> Añadir registro
          </button>
        )}
      </div>
      {kind === "financial" && (
        <p className="notice">
          Solo los cortes aprobados y vigentes podrán usarse en una evaluación.
          La aprobación requiere otra persona autorizada.
        </p>
      )}
      {!canEdit && (
        <p className="readonly">Tu función permite consultar esta sección.</p>
      )}
      {editing && (
        <Editor
          key={editing === "new" ? "new" : editing.id}
          definition={definition}
          row={editing === "new" ? undefined : editing}
          companyId={companyId}
          csrf={csrf}
          transport={transport}
          onClose={() => setEditing(null)}
        />
      )}
      {query.isPending ? (
        <p role="status" className="empty">
          Cargando {definition.title.toLowerCase()}…
        </p>
      ) : query.isError ? (
        <div role="alert" className="error">
          {failure(query.error)}{" "}
          <button onClick={() => void query.refetch()}>Reintentar</button>
        </div>
      ) : (
        <>
          <div className="list-heading">
            <h2>Registros de la empresa</h2>
            <span>{query.data.items.length} en esta página</span>
          </div>
          {query.data.items.length === 0 ? (
            <div className="empty">
              <p>Aún no hay registros de {definition.title.toLowerCase()}.</p>
              <p>
                {canEdit
                  ? "Añade el primero para construir el perfil empresarial."
                  : "Una persona con permiso de edición puede añadirlos."}
              </p>
            </div>
          ) : (
            <div className="records">
              {query.data.items.map((row) => (
                <article className="record" key={row.id}>
                  <header>
                    <div>
                      <h3>
                        {String(
                          row.data.name ??
                            row.data.legalName ??
                            row.data.client ??
                            row.data.fileName ??
                            row.data.source ??
                            row.data.periodEnd ??
                            row.data.objectId ??
                            definition.title,
                        )}
                      </h3>
                      <span className="muted">
                        Versión {row.version} · {statusLabel(row.data.status)}
                      </span>
                    </div>
                    <div className="record-actions">
                      {canEdit &&
                        !["Approved", "Published"].includes(
                          String(row.data.status),
                        ) && (
                          <button onClick={() => setEditing(row)}>
                            <Pencil size={15} aria-hidden="true" /> Editar
                          </button>
                        )}
                      {row.data.status === "Draft" &&
                        permissions.includes(
                          kind === "financial"
                            ? "financial.approve"
                            : "rules.publish",
                        ) && (
                          <button
                            disabled={approve.isPending}
                            onClick={() => approve.mutate(row)}
                          >
                            <Check size={16} aria-hidden="true" />{" "}
                            {kind === "financial"
                              ? "Aprobar corte"
                              : "Publicar regla"}
                          </button>
                        )}
                    </div>
                  </header>
                  <dl>
                    {definition.fields.map((field) => (
                      <div key={field.key}>
                        <dt>{field.label}</dt>
                        <dd>{format(row.data[field.key])}</dd>
                      </div>
                    ))}
                  </dl>
                  <details>
                    <summary>Identificador del registro</summary>
                    <code>{row.id}</code>
                  </details>
                </article>
              ))}
            </div>
          )}
          <nav className="pagination" aria-label="Páginas de registros">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 10))}
            >
              Anterior
            </button>
            <span>Página {offset / 10 + 1}</span>
            <button
              disabled={!query.data.hasMore}
              onClick={() => setOffset(offset + 10)}
            >
              Siguiente
            </button>
          </nav>
        </>
      )}
      {approve.isError && (
        <p role="alert" className="error">
          {failure(approve.error)}
        </p>
      )}
      {approve.isSuccess && <p role="status">Cambio confirmado.</p>}
    </section>
  );
}

interface EditorProps {
  definition: Definition;
  row?: Resource;
  companyId: string;
  csrf: string;
  onClose: () => void;
  transport?: ProfileTransport;
}
export function Editor({
  definition,
  row,
  companyId,
  csrf,
  onClose,
  transport,
}: EditorProps): ReactElement {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (transport)
        return transport.save(companyId, definition.kind, data, row);
      const base = `/v1/companies/${companyId}/${definition.kind}`;
      const config = {
        headers: commandHeaders(csrf, row ? `"${row.version}"` : undefined),
      };
      return row
        ? http.put(base + "/" + row.id, data, config)
        : http.post(base, data, config);
    },
    onSuccess: async () => {
      await cache.invalidateQueries({
        queryKey: ["profile", companyId, definition.kind],
      });
      onClose();
    },
  });
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(
      definition.fields.map((field) => [
        field.key,
        field.type === "checkbox" ? form.has(field.key) : form.get(field.key),
      ]),
    );
    const result = definition.schema.safeParse(data);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      event.currentTarget
        .querySelector<HTMLElement>(
          `[name="${String(result.error.issues[0].path[0])}"]`,
        )
        ?.focus();
      return;
    }
    setErrors({});
    mutation.mutate(result.data);
  }
  return (
    <form
      className="editor"
      onSubmit={submit}
      noValidate
      aria-label={row ? "Editar registro" : "Añadir registro"}
    >
      <div className="editor-heading">
        <h2>{row ? "Editar registro" : "Añadir registro"}</h2>
        <button type="button" onClick={onClose}>
          <X size={16} aria-hidden="true" /> Cerrar
        </button>
      </div>
      <div className="form-grid">
        {definition.fields.map((field) => {
          const errorId = "error-" + field.key;
          const rawValue = row?.data[field.key];
          const value = Array.isArray(rawValue)
            ? rawValue.join(", ")
            : String(
                rawValue ??
                  (field.key === "countryCode"
                    ? "CO"
                    : field.key === "currency"
                      ? "COP"
                      : (field.options?.[0] ?? "")),
              );
          const common = {
            id: field.key,
            name: field.key,
            "aria-invalid": !!errors[field.key],
            "aria-describedby": errors[field.key] ? errorId : undefined,
          };
          return (
            <div
              className={field.type === "textarea" ? "field full" : "field"}
              key={field.key}
            >
              <label htmlFor={field.key}>{field.label}</label>
              {field.type === "checkbox" ? (
                <input
                  {...common}
                  type="checkbox"
                  defaultChecked={Boolean(rawValue ?? field.key === "active")}
                />
              ) : field.options ? (
                <select {...common} defaultValue={value}>
                  {field.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea {...common} defaultValue={value} rows={3} />
              ) : (
                <input
                  {...common}
                  type={field.type === "list" ? "text" : (field.type ?? "text")}
                  defaultValue={value}
                  readOnly={
                    definition.kind === "company" && field.key !== "legalName"
                  }
                />
              )}
              {errors[field.key] && (
                <p className="field-error" id={errorId}>
                  {errors[field.key]}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {mutation.isError && (
        <p role="alert" className="error">
          {failure(mutation.error)}{" "}
          <button
            type="button"
            onClick={() =>
              void cache.invalidateQueries({
                queryKey: ["profile", companyId, definition.kind],
              })
            }
          >
            Recargar registros
          </button>
        </p>
      )}
      <footer>
        <span>Los cambios se guardan con historial.</span>
        <button className="primary" type="submit" disabled={mutation.isPending}>
          <Save size={17} aria-hidden="true" />
          {mutation.isPending ? "Guardando…" : "Guardar registro"}
        </button>
      </footer>
    </form>
  );
}
function format(value: unknown): string {
  return typeof value === "boolean"
    ? value
      ? "Sí"
      : "No"
    : Array.isArray(value)
      ? value.join(", ") || "Sin integrantes"
      : String(value ?? "Sin dato");
}
function statusLabel(value: unknown): string {
  return (
    (
      {
        Draft: "Borrador",
        Approved: "Aprobado",
        Published: "Publicado",
        PendingEvidence: "Pendiente de evidencia",
        PendingUpload: "Pendiente de carga segura",
      } as Record<string, string>
    )[String(value)] ?? "Registrado"
  );
}
