import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ActiveFilterChips } from "@/components/selection";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { useFilterChips } from "@/hooks/useFilterChips";
import { alertsService } from "@/services/alertsService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function AlertasPage() {
  const { chips, setChips } = useFilterChips();
  const alerts = useDemoStore((state) => state.workspace.alerts);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const rows = useMemo(
    () =>
      alerts.filter((item) => {
        if (chips.some((chip) => chip.field === "kind" && chip.value !== item.kind)) return false;
        if (chips.some((chip) => chip.field === "status" && chip.value === "Sin leer" && item.read)) return false;
        return true;
      }),
    [alerts, chips],
  );
  return (
    <section className="grid gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Alertas</p>
          <h1 className="text-3xl font-semibold">Señales de la mesa</h1>
        </div>
        <Button
          onClick={() =>
            openFlow({
              type: "filters-generic",
              title: "Filtros de alertas",
              size: "compact",
              payload: {
                active: chips,
                onApply: setChips,
                fields: [
                  { field: "kind", label: "Tipo", options: ["nueva", "cambio", "adenda", "vencimiento", "riesgo"] },
                  { field: "status", label: "Estado", options: ["Sin leer"] },
                ],
              },
            })
          }
        >
          Filtros
        </Button>
      </header>
      <ActiveFilterChips chips={chips} onRemove={(id) => setChips(chips.filter((chip) => chip.id !== id))} onClear={() => setChips([])} />
      <ul className="grid gap-2">
        {rows.map((item) => (
          <li key={item.id} className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge value={item.kind} />
                <strong>{item.title}</strong>
              </div>
              <p className="text-sm text-muted">{item.detail}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void alertsService.markRead(item.id)}>
                Marcar
              </Button>
              <Button size="sm" onClick={() => void alertsService.toggleSilence(item.id)}>
                {item.silenced ? "Reactivar" : "Silenciar"}
              </Button>
              <Button size="sm" onClick={() => openFlow({ type: "alert-detail", title: "Detalle de alerta", recordId: item.id, size: "compact" })}>
                Detalle
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
