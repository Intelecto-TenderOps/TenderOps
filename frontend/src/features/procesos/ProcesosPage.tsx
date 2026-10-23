import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { DataWorkspace } from "@/components/data/DataWorkspace";
import { DataTable } from "@/components/data/DataTable";
import { ContextDetailPanel } from "@/components/data/ContextDetailPanel";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/viz/StatusBadge";
import type { Tender } from "@/contracts";
import { useFilterChips } from "@/hooks/useFilterChips";
import { formatCurrency } from "@/lib/format";
import { chipsToFilters, filterTenders } from "@/services/tendersService";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDrawerStore } from "@/store/drawer-store";

const columns: ColumnDef<Tender>[] = [
  { accessorKey: "secopId", header: "Proceso" },
  { accessorKey: "object", header: "Objeto" },
  { accessorKey: "owner", header: "Responsable" },
  { accessorKey: "recommendation", header: "Recomendación", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
  { accessorKey: "status", header: "Estado", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
];

export function ProcesosPage() {
  const navigate = useNavigate();
  const { chips, setChips } = useFilterChips();
  const workspace = useWorkspace();
  const tenders = useMemo(
    () => filterTenders(workspace.tenders, chipsToFilters(chips)),
    [workspace.tenders, chips],
  );
  const [selectedId, setSelectedId] = useState(tenders[0]?.id);
  const selected = tenders.find((item) => item.id === selectedId);
  const openFlow = useDrawerStore((state) => state.openFlow);
  return (
    <DataWorkspace
      title="Expedientes"
      eyebrow="Procesos"
      description="Cada fila abre el expediente sin perder el listado."
      chips={chips}
      onRemoveChip={(id) => setChips(chips.filter((chip) => chip.id !== id))}
      onClearChips={() => setChips([])}
      toolbar={
        <Button
          onClick={() =>
            openFlow({
              type: "filters-generic",
              title: "Filtros de procesos",
              size: "compact",
              payload: { active: chips, onApply: setChips },
            })
          }
        >
          Filtros
        </Button>
      }
      list={
        <DataTable
          data={tenders}
          columns={columns}
          selectedId={selectedId}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      }
      detail={
        selected && (
          <ContextDetailPanel
            title={selected.secopId}
            actions={
              <Button size="sm" onClick={() => navigate(`/procesos/${selected.secopId}`)}>
                Abrir expediente
              </Button>
            }
          >
            <p className="text-sm">{selected.object}</p>
            <p className="mt-2 text-sm text-muted">{formatCurrency(selected.value)}</p>
          </ContextDetailPanel>
        )
      }
    />
  );
}
