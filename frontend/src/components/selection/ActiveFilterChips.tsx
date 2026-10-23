import type { FilterChip } from "@/contracts";
import { ClearAllButton } from "./ClearAllButton";
import { SelectionChips } from "./SelectionChip";

export function ActiveFilterChips({
  chips,
  onRemove,
  onClear,
  pending = false,
}: {
  chips: FilterChip[];
  onRemove: (id: string) => void;
  onClear: () => void;
  pending?: boolean;
}) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SelectionChips
        items={chips.map((chip) => ({
          id: chip.id,
          label: `${chip.label}: ${chip.value}`,
          field: chip.field,
        }))}
        onRemove={onRemove}
        pending={pending}
      />
      <ClearAllButton onClick={onClear} />
    </div>
  );
}
