import type { ReactNode } from "react";
import { FilterChipGroup } from "@/components/selection";
import type { FilterChip } from "@/contracts";

export function AdvancedFilters({
  active,
  pending,
  onRemoveActive,
  onRemovePending,
  onClearActive,
  onClearPending,
  children,
}: {
  active: FilterChip[];
  pending: FilterChip[];
  onRemoveActive: (id: string) => void;
  onRemovePending: (id: string) => void;
  onClearActive: () => void;
  onClearPending: () => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <FilterChipGroup
        active={active}
        pending={pending}
        onRemoveActive={onRemoveActive}
        onRemovePending={onRemovePending}
        onClearActive={onClearActive}
        onClearPending={onClearPending}
      />
      <div className="grid gap-3">{children}</div>
    </div>
  );
}
