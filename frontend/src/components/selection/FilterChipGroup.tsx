import type { FilterChip } from "@/contracts";
import { ActiveFilterChips } from "./ActiveFilterChips";

export function FilterChipGroup({
  active,
  pending,
  onRemoveActive,
  onRemovePending,
  onClearActive,
  onClearPending,
}: {
  active: FilterChip[];
  pending?: FilterChip[];
  onRemoveActive: (id: string) => void;
  onRemovePending?: (id: string) => void;
  onClearActive: () => void;
  onClearPending?: () => void;
}) {
  return (
    <div className="grid gap-2">
      <ActiveFilterChips chips={active} onRemove={onRemoveActive} onClear={onClearActive} />
      {pending?.length ? (
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-muted">Pendientes de aplicar</p>
          <ActiveFilterChips
            chips={pending}
            onRemove={onRemovePending ?? onRemoveActive}
            onClear={onClearPending ?? onClearActive}
            pending
          />
        </div>
      ) : null}
    </div>
  );
}
