import { ChipOverflow } from "./ChipOverflow";
import { ClearAllButton } from "./ClearAllButton";
import type { ChipItem } from "./SelectionChip";
import { Button } from "@/components/ui/button";

export function SelectedItemsBar({
  items,
  noun,
  actions,
  onRemove,
  onClear,
}: {
  items: ChipItem[];
  noun: string;
  actions?: { label: string; onClick: () => void }[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (!items.length) return null;
  return (
    <div className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2">
      <strong className="text-sm">
        {items.length} {noun} {items.length === 1 ? "seleccionado" : "seleccionados"}
      </strong>
      <ChipOverflow items={items} onRemove={onRemove} />
      <ClearAllButton onClick={onClear} />
      <div className="ml-auto flex flex-wrap gap-2">
        {actions?.map((action) => (
          <Button key={action.label} size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
