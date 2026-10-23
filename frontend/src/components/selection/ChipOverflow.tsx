import { useMemo, useState } from "react";
import { SelectionChip, type ChipItem } from "./SelectionChip";

export function ChipOverflow({
  items,
  limit = 4,
  onRemove,
}: {
  items: ChipItem[];
  limit?: number;
  onRemove?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const visible = useMemo(
    () => (open ? items : items.slice(0, limit)),
    [items, limit, open],
  );
  const hidden = items.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((item) => (
        <SelectionChip key={item.id} item={item} onRemove={onRemove} />
      ))}
      {hidden > 0 ? (
        <button
          type="button"
          className="rounded-full bg-mist px-2 py-1 text-xs text-corporate"
          onClick={() => setOpen(true)}
        >
          +{hidden}
        </button>
      ) : null}
      {open && items.length > limit ? (
        <button type="button" className="text-xs text-muted" onClick={() => setOpen(false)}>
          Ocultar
        </button>
      ) : null}
    </div>
  );
}
