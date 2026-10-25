import { useMemo } from "react";
import { DataTable, RichDate, RichPrimary, RichStage, RichValue, type RichColumn } from "@/components/data/DataTable";
import { PageHeader } from "@/components/data/PageHeader";
import { Button } from "@/components/ui/button";
import { ActiveFilterChips } from "@/components/selection";
import type { AlertItem } from "@/contracts";
import { useFilterChips } from "@/hooks/useFilterChips";
import { prettyLabel } from "@/lib/format";
import { alertsService } from "@/services/alertsService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

const columns: RichColumn<AlertItem>[] = [
  {
    id: "alerta",
    header: "Alerta",
    grow: true,
    sortValue: (row) => row.title,
    cell: (row) => <RichPrimary kicker={prettyLabel(row.kind)} title={row.title} detail={row.detail} />,
  },
  {
    id: "urgencia",
    header: "Urgencia",
    sortValue: (row) => row.urgency,
    cell: (row) => <RichValue primary={prettyLabel(row.urgency)} />,
  },
  {
    id: "etapa",
    header: "Etapa",
    sortValue: (row) => (row.read ? 1 : 0),
    cell: (row) => <RichStage label={row.read ? "Leída" : "Sin leer"} />,
  },
  {
    id: "cierre",
    header: "Fecha",
    sortValue: (row) => row.createdAt,
    cell: (row) => <RichDate value={row.createdAt} />,
  },
  {
    id: "acciones",
    header: "Acciones",
    cell: (row) => (
      <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
        <Button size="sm" onClick={() => void alertsService.markRead(row.id)}>
          Marcar
        </Button>
        <Button size="sm" onClick={() => void alertsService.toggleSilence(row.id)}>
          {row.silenced ? "Reactivar" : "Silenciar"}
        </Button>
      </div>
    ),
  },
];

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
    <section className="grid min-w-0 gap-2">
      <PageHeader
        eyebrow="Alertas"
        title="Señales de la mesa"
        actions={
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
        }
      />
      <ActiveFilterChips chips={chips} onRemove={(id) => setChips(chips.filter((chip) => chip.id !== id))} onClear={() => setChips([])} />
      <div className="table-surface min-w-0 overflow-hidden rounded-[20px]">
        <DataTable
          data={rows}
          columns={columns}
          onRowClick={(item) =>
            openFlow({ type: "alert-detail", title: "Detalle de alerta", recordId: item.id, size: "compact" })
          }
        />
      </div>
    </section>
  );
}
