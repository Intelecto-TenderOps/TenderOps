import { X } from "lucide-react";
import { FlowStepper } from "./FlowStepper";

export function FlowDrawerHeader({
  title,
  description,
  recordId,
  steps,
  step,
  onClose,
}: {
  title: string;
  description?: string;
  recordId?: string;
  steps: string[];
  step: number;
  onClose: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/60 bg-white/70 px-5 py-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Flujo operativo
          </p>
          <h2 id="flow-title" className="text-lg font-semibold text-ink">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          {recordId ? (
            <p className="mt-1 font-mono text-xs text-corporate">{recordId}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-full p-2 text-muted hover:bg-mist hover:text-ink"
          aria-label="Cerrar panel"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <div className="mt-3">
        <FlowStepper steps={steps} current={step} />
      </div>
    </header>
  );
}
