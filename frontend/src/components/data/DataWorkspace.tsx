import type { ReactNode } from "react";
import { ActiveFilterChips } from "@/components/selection";
import { PageHeader } from "@/components/data/PageHeader";
import type { FilterChip } from "@/contracts";
import { cn } from "@/lib/cn";

export function DataWorkspace({
  title,
  eyebrow,
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
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <PageHeader eyebrow={eyebrow} title={title} actions={toolbar} />
      <ActiveFilterChips chips={chips} onRemove={onRemoveChip} onClear={onClearChips} />
      {selectionBar}
      <div
        className={cn(
          "grid min-h-0 min-w-0 flex-1 gap-3",
          detail ? "xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]" : "grid-cols-1",
          dense && "text-[13px]",
        )}
      >
        <div className="table-surface min-h-0 min-w-0 overflow-hidden rounded-[20px]">{list}</div>
        {detail}
      </div>
    </section>
  );
}

export function DenseDataWorkspace(props: Parameters<typeof DataWorkspace>[0]) {
  return <DataWorkspace {...props} dense />;
}
