import { useEffect, useId, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export interface ActiveFilter {
  key: string;
  label: string;
  remove: () => void;
}

/** Shared modal filter drawer; business filter state remains in each screen. */
export function FilterPanel({
  children,
  active,
  clear,
  formId,
}: {
  children: ReactNode;
  active: ActiveFilter[];
  clear: () => void;
  formId?: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useId();
  useEffect(() => {
    const element = dialog.current;
    const opener = trigger.current;
    if (!element || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);
  return (
    <div className="filter-toolbar">
      <button
        ref={trigger}
        className="filter-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal size={18} aria-hidden="true" /> Filtros
        {active.length > 0 && (
          <span className="filter-count">{active.length}</span>
        )}
      </button>
      <div
        className="active-filters"
        aria-label="Filtros seleccionados"
        aria-live="polite"
      >
        {active.map((item) => (
          <button
            className="filter-chip"
            type="button"
            key={item.key}
            aria-label={`Quitar filtro ${item.label}`}
            onClick={item.remove}
          >
            {item.label}
            <X size={14} aria-hidden="true" />
          </button>
        ))}
        {active.length > 0 && (
          <button className="filter-clear" type="button" onClick={clear}>
            Limpiar todos
          </button>
        )}
      </div>
      <dialog
        ref={dialog}
        className="filter-drawer"
        aria-labelledby={title}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              setOpen(false);
          }
        }}
      >
        <header>
          <div>
            <p className="eyebrow">PERSONALIZA LOS RESULTADOS</p>
            <h2 id={title}>Filtros de búsqueda</h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar filtros"
            onClick={() => setOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="filter-drawer-content">{children}</div>
        <footer>
          <button
            type="button"
            onClick={() => {
              dialog.current?.querySelector("form")?.reset();
              clear();
            }}
          >
            Limpiar todos
          </button>
          <button
            className="primary"
            type={formId ? "submit" : "button"}
            form={formId}
            onClick={formId ? undefined : () => setOpen(false)}
          >
            {formId ? "Buscar procesos" : "Ver resultados"}
          </button>
        </footer>
      </dialog>
    </div>
  );
}
