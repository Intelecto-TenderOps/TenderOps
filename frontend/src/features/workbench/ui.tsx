import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  X,
} from "lucide-react";
import { z } from "zod";
import { describeError } from "./hooks";
import type { WorkbenchContext } from "./types";

export function money(value: string, currency = "COP"): string {
  const [whole, decimal] = value.split(".");
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${decimal ? "," + decimal : ""}`;
}
export function day(value: string): string {
  if (!value) return "Sin registro";
  const parsed = new Date(value.length === 10 ? value + "T12:00:00Z" : value);
  if (!Number.isFinite(parsed.getTime())) return "Fecha por revisar";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: value.length === 10 ? "UTC" : "America/Bogota",
  }).format(parsed);
}
export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: string;
}): ReactElement {
  const text = String(children);
  const inferred =
    /No cumple|Fallido|Rechazado|Rejected|Devuelta|Conflicto|Alta|Bloqueado/.test(
      text,
    )
      ? "danger"
      : /Pendiente|Indeterminado|Quarantined|Revisión|Invalidada|En curso|Scanning/.test(
            text,
          )
        ? "warning"
        : /Cumple|Completado|Aprobada|Available|Revisado|Vinculada/.test(text)
          ? "success"
          : "neutral";
  return (
    <span className={`badge badge-${tone ?? inferred}`}>
      <span className="badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
export function PageHeading({
  eyebrow = "ESPACIO DE TRABAJO",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: string;
}): ReactElement {
  return (
    <div className={`callout callout-${tone}`}>
      <CircleAlert size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <div className="empty-state">
      <div className="empty-symbol" aria-hidden="true">
        —
      </div>
      <h2>{title}</h2>
      <p>
        {children ??
          "Prueba otros filtros o vuelve a esta sección cuando haya información disponible."}
      </p>
    </div>
  );
}
export function ServiceState({
  context,
  error,
  retry,
}: {
  context: WorkbenchContext;
  error: unknown;
  retry: () => void;
}): ReactElement {
  return (
    <section>
      <PageHeading
        title="Este espacio aún no está conectado"
        description="La interfaz está lista para trabajar cuando el servicio esté disponible."
      />
      <Notice>{describeError(error)}</Notice>
      <div className="inline-actions">
        <button onClick={retry}>Reintentar conexión</button>
        <Link
          className="primary"
          to={"/demo" + location.pathname.replace(/^\/app/, "")}
        >
          Explorar demostración <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <p className="small muted">
        Empresa: {context.companyName}. Los datos de demostración se mantienen
        separados de tu empresa.
      </p>
    </section>
  );
}
export function Busy(): ReactElement {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" aria-hidden="true" />
      <p>Cargando tu espacio de trabajo…</p>
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </div>
  );
}
export function Feedback({
  error,
  success,
}: {
  error?: unknown;
  success?: boolean;
}): ReactElement | null {
  return error ? (
    <p role="alert" className="error">
      {describeError(error)}
    </p>
  ) : success ? (
    <p role="status" className="success-message">
      <Check size={16} aria-hidden="true" /> Cambio guardado en la demostración.
    </p>
  ) : null;
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}): ReactElement {
  return (
    <div className="stat">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}
export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
  numeric?: boolean;
}
interface TableProps<T extends { id: string }> {
  rows: T[];
  columns: Column<T>[];
  label: string;
  pageSize?: number;
  empty?: string;
}
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  label,
  pageSize = 8,
  empty,
}: TableProps<T>): ReactElement {
  const [sort, setSort] = useState<{ key: string; descending: boolean }>({
    key: "",
    descending: false,
  });
  const [requestedPage, setPage] = useState<number>(0);
  const sorted = [...rows];
  const column = columns.find((item) => item.key === sort.key);
  if (column?.sort)
    sorted.sort((a, b) => {
      const av = column.sort!(a);
      const bv = column.sort!(b);
      return (
        (typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "es")) *
        (sort.descending ? -1 : 1)
      );
    });
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(requestedPage, pages - 1);
  if (!rows.length)
    return <Empty title={empty ?? "No hay resultados para estos filtros"} />;
  return (
    <>
      <div
        className="table-scroll"
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        <table className="data-table">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              {columns.map((item) => (
                <th
                  key={item.key}
                  scope="col"
                  aria-sort={
                    sort.key === item.key
                      ? sort.descending
                        ? "descending"
                        : "ascending"
                      : undefined
                  }
                  className={item.numeric ? "numeric" : undefined}
                >
                  {item.sort ? (
                    <button
                      className="sort-button"
                      onClick={() => {
                        setSort({
                          key: item.key,
                          descending: sort.key === item.key && !sort.descending,
                        });
                        setPage(0);
                      }}
                    >
                      {item.label}
                      <ArrowDownUp size={13} aria-hidden="true" />
                    </button>
                  ) : (
                    item.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(page * pageSize, (page + 1) * pageSize).map((row) => (
              <tr key={row.id}>
                {columns.map((item) => (
                  <td
                    className={item.numeric ? "numeric" : undefined}
                    key={item.key}
                  >
                    {item.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)}{" "}
          de {rows.length} registros
        </span>
        <nav aria-label={"Páginas de " + label}>
          <button
            aria-label="Página anterior"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span>
            Página {page + 1} de {pages}
          </span>
          <button
            aria-label="Página siguiente"
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </>
  );
}

export interface FormField {
  name: string;
  label: string;
  type?:
    "text" | "textarea" | "select" | "date" | "number" | "checkbox" | "time";
  options?: { value: string; label: string }[];
  help?: string;
}
export interface FormSpec {
  title: string;
  description?: string;
  fields: FormField[];
  initial?: Record<string, unknown>;
  schema: z.ZodType<Record<string, unknown>>;
  submitLabel?: string;
  onSave: (values: Record<string, unknown>) => Promise<unknown>;
}
export const required = z.string().trim().min(1, "Completa este campo.");
export const options = (values: string[]): { value: string; label: string }[] =>
  values.map((value) => ({ value, label: value }));
export function FormDialog({
  spec,
  onClose,
}: {
  spec: FormSpec;
  onClose: () => void;
}): ReactElement {
  const dialog = useRef<HTMLDialogElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    return () => {
      element?.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const raw = Object.fromEntries(
      spec.fields.map((field) => [
        field.name,
        field.type === "checkbox"
          ? values.has(field.name)
          : values.get(field.name),
      ]),
    );
    const parsed = spec.schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      form
        .querySelector<HTMLElement>(
          `[name="${String(parsed.error.issues[0].path[0])}"]`,
        )
        ?.focus();
      return;
    }
    setPending(true);
    setError(null);
    setErrors({});
    try {
      await spec.onSave(parsed.data);
      onClose();
    } catch (failure) {
      setError(failure);
    } finally {
      setPending(false);
    }
  }
  return (
    <dialog
      className="action-dialog"
      ref={dialog}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        if (pending) event.preventDefault();
        else onClose();
      }}
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <header>
          <div>
            <p className="eyebrow">ACCIÓN DEL EXPEDIENTE</p>
            <h2 id="dialog-title">{spec.title}</h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar ventana"
            disabled={pending}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {spec.description && (
          <p className="dialog-description">{spec.description}</p>
        )}
        <div className="dialog-fields">
          {spec.fields.map((field) => {
            const id = `dialog-${field.name}`;
            const errorId = id + "-error";
            const value = spec.initial?.[field.name];
            const props = {
              id,
              name: field.name,
              "aria-invalid": !!errors[field.name],
              "aria-describedby": errors[field.name]
                ? errorId
                : field.help
                  ? id + "-help"
                  : undefined,
            };
            return (
              <div className="field" key={field.name}>
                <label htmlFor={id}>{field.label}</label>
                {field.type === "select" ? (
                  <select
                    {...props}
                    defaultValue={String(
                      value ?? field.options?.[0]?.value ?? "",
                    )}
                  >
                    {field.options?.map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    {...props}
                    rows={4}
                    defaultValue={String(value ?? "")}
                  />
                ) : field.type === "checkbox" ? (
                  <input
                    {...props}
                    type="checkbox"
                    defaultChecked={Boolean(value)}
                  />
                ) : (
                  <input
                    {...props}
                    type={field.type ?? "text"}
                    defaultValue={String(value ?? "")}
                  />
                )}
                {field.help && (
                  <p id={id + "-help"} className="field-help">
                    {field.help}
                  </p>
                )}
                {errors[field.name] && (
                  <p className="field-error" id={errorId}>
                    {errors[field.name]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <Feedback error={error} />
        <footer>
          <button type="button" disabled={pending} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={pending}>
            {pending ? "Guardando…" : (spec.submitLabel ?? "Guardar cambios")}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
export function downloadText(
  name: string,
  content: string,
  contentType = "text/plain;charset=utf-8",
): void {
  const url = URL.createObjectURL(new Blob([content], { type: contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
