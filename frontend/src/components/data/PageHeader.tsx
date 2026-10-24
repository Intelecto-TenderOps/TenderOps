import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
        ) : null}
        <h1 className="text-[17px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
