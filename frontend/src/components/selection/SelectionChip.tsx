import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ChipItem {
  id: string;
  label: string;
  field?: string;
}

export function SelectionChip({
  item,
  onRemove,
  pending = false,
}: {
  item: ChipItem;
  onRemove?: (id: string) => void;
  pending?: boolean;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        pending
          ? "border-dashed border-bright/50 bg-mist/70 text-muted"
          : "border-bright/30 bg-mist text-ink",
      )}
    >
      <span className="truncate">{item.label}</span>
      {onRemove ? (
        <button
          type="button"
          className="rounded-full p-0.5 text-muted hover:bg-white hover:text-ink"
          aria-label={`Quitar ${item.label}`}
          onClick={() => onRemove(item.id)}
        >
          <X size={12} aria-hidden="true" />
        </button>
      ) : null}
    </motion.span>
  );
}

export function SelectionChips({
  items,
  onRemove,
  pending = false,
}: {
  items: ChipItem[];
  onRemove?: (id: string) => void;
  pending?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <SelectionChip key={item.id} item={item} onRemove={onRemove} pending={pending} />
        ))}
      </AnimatePresence>
    </div>
  );
}
