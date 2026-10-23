import type { ReactNode } from "react";
import { ActiveFilterChips } from "@/components/selection";
import type { FilterChip } from "@/contracts";
import { cn } from "@/lib/cn";

export function DataWorkspace({
  title,
  eyebrow,
  description,
  toolbar,
  chips,
  onRemoveChip,
  onClearChips,
  selectionBar,
  list,
  detail,
  dense = false,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  toolbar: ReactNode;
  chips: FilterChip[];
  onRemoveChip: (id: string) => void;
  onClearChips: () => void;
  selectionBar?: ReactNode;
  list: ReactNode;
  detail?: ReactNode;
  dense?: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">{toolbar}</div>
      </header>
      <ActiveFilterChips chips={chips} onRemove={onRemoveChip} onClear={onClearChips} />
      {selectionBar}
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3",
          detail ? "xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]" : "grid-cols-1",
          dense && "text-[13px]",
        )}
      >
        <div className="table-surface min-h-0 overflow-hidden rounded-[24px]">{list}</div>
        {detail}
      </div>
    </section>
  );
}

export function DenseDataWorkspace(props: Parameters<typeof DataWorkspace>[0]) {
  return <DataWorkspace {...props} dense />;
}
