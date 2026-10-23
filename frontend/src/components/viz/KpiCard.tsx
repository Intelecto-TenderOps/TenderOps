import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  action,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn";
  action?: ReactNode;
}) {
  return (
    <article
      className={cn(
        "glass-panel rounded-[22px] p-4",
        tone === "good" && "ring-1 ring-cyan/40",
        tone === "warn" && "ring-1 ring-amber-300/70",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </article>
  );
}
