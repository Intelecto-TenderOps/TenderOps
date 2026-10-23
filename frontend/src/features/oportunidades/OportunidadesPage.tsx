import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataWorkspace } from "@/components/data/DataWorkspace";
import { DataTable } from "@/components/data/DataTable";
import { ContextDetailPanel } from "@/components/data/ContextDetailPanel";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/viz/StatusBadge";
import type { CommercialOpportunity } from "@/contracts";
import { useFilterChips } from "@/hooks/useFilterChips";
import { formatCurrency } from "@/lib/format";
import { opportunitiesService } from "@/services/opportunitiesService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

const columns: ColumnDef<CommercialOpportunity>[] = [
  { accessorKey: "account", header: "Cuenta" },
  { accessorKey: "name", header: "Oportunidad" },
  { accessorKey: "dynamicsOpportunityId", header: "Dynamics" },
  { accessorKey: "value", header: "Valor", cell: ({ getValue }) => formatCurrency(Number(getValue())) },
  { accessorKey: "owner", header: "Responsable" },
  { accessorKey: "stage", header: "Etapa" },
  { accessorKey: "status", header: "Estado", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
];

export function OportunidadesPage() {
  const { chips, setChips } = useFilterChips();
  const opportunities = useDemoStore((state) => state.workspace.opportunities);
  const tenders = useDemoStore((state) => state.workspace.tenders);
  const [selectedId, setSelectedId] = useState(opportunities[0]?.id);
  const selected = opportunities.find((item) => item.id === selectedId);
  const origin = tenders.find((item) => item.id === selected?.tenderId);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const rows = opportunities.filter((item) =>
    chips.every((chip) => (chip.field === "status" ? item.status === chip.value : true)),
  );
  return (
    <DataWorkspace
      title="Oportunidades Dynamics 365"
      eyebrow="Comercial"
      description="Una licitación detectada no es todavía una oportunidad comercial. El registro se simula."
      chips={chips}
      onRemoveChip={(id) => setChips(chips.filter((chip) => chip.id !== id))}
      onClearChips={() => setChips([])}
      toolbar={
        <>
          <Button
            onClick={() =>
              openFlow({
                type: "filters-generic",
                title: "Filtros de oportunidades",
                size: "compact",
                payload: {
                  active: chips,
                  onApply: setChips,
                  fields: [{ field: "status", label: "Estado", options: ["abierta", "cerrada"] }],
                },
              })
            }
          >
            Filtros
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              openFlow({
                type: "create-opportunity",
                title: "Registrar oportunidad",
                steps: ["Origen", "Cuenta", "Confirmación"],
                payload: { tenderId: tenders.find((item) => !item.dynamicsOpportunityId)?.id },
              })
            }
          >
            Crear
          </Button>
        </>
      }
      list={<DataTable data={rows} columns={columns} selectedId={selectedId} onRowClick={(row) => setSelectedId(row.id)} />}
      detail={
        selected && (
          <ContextDetailPanel
            title="Oportunidad comercial"
            actions={
              selected.status === "abierta" ? (
                <Button size="sm" onClick={() => void opportunitiesService.close(selected.id, "ganada")}>
                  Cerrar ganada
                </Button>
              ) : null
            }
          >
            <p className="text-sm">Cuenta Dynamics: {selected.dynamicsAccountId}</p>
            <p className="text-sm">Proceso origen: {origin?.secopId ?? "sin vincular"}</p>
            <p className="text-sm">Actividades {selected.activities} · tareas {selected.tasks} · documentos {selected.documents}</p>
            <p className="mt-2 text-xs text-muted">
              Diferencia: el proceso SECOP vive en TenderOps; esta ficha representa el registro comercial simulado.
            </p>
          </ContextDetailPanel>
        )
      }
    />
  );
}
