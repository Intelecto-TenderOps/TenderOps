import { cn } from "@/lib/cn";

const tones: Record<string, string> = {
  abierto: "bg-emerald-50 text-emerald-800",
  cumple: "bg-emerald-50 text-emerald-800",
  BID: "bg-emerald-50 text-emerald-800",
  ganada: "bg-emerald-50 text-emerald-800",
  vigente: "bg-emerald-50 text-emerald-800",
  hecha: "bg-emerald-50 text-emerald-800",
  pendiente: "bg-amber-50 text-amber-800",
  en_proceso: "bg-amber-50 text-amber-800",
  REVISION: "bg-amber-50 text-amber-800",
  por_vencer: "bg-amber-50 text-amber-800",
  medio: "bg-amber-50 text-amber-800",
  no_cumple: "bg-red-50 text-red-700",
  NO_BID: "bg-red-50 text-red-700",
  critico: "bg-red-50 text-red-700",
  alto: "bg-red-50 text-red-700",
  vencido: "bg-red-50 text-red-700",
  cargado: "bg-sky-50 text-sky-800",
  listo_no_cargado: "bg-indigo-50 text-indigo-800",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        tones[value] ?? "bg-mist text-ink",
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
