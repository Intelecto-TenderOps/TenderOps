import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataWorkspace } from "@/components/data/DataWorkspace";
import { DataTable } from "@/components/data/DataTable";
import { ContextDetailPanel } from "@/components/data/ContextDetailPanel";
import { Button } from "@/components/ui/button";
import { ScoreIndicator } from "@/components/viz/ScoreIndicator";
import { StatusBadge } from "@/components/viz/StatusBadge";
import type { Assessment } from "@/contracts";
import { useFilterChips } from "@/hooks/useFilterChips";
import { assessmentsService } from "@/services/assessmentsService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function CalificacionPage() {
  const { chips, setChips } = useFilterChips();
  const workspace = useDemoStore((state) => state.workspace);
  const rows = useMemo(
    () =>
      workspace.assessments.filter((item) =>
        chips.every((chip) =>
          chip.field === "risk" ? item.risk === chip.value : true,
        ),
      ),
    [workspace.assessments, chips],
  );
  const [selectedId, setSelectedId] = useState(rows[0]?.id);
  const selected = rows.find((item) => item.id === selectedId);
  const tender = workspace.tenders.find((item) => item.id === selected?.tenderId);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const columns: ColumnDef<Assessment>[] = [
    { accessorKey: "score", header: "Puntaje", cell: ({ getValue }) => <ScoreIndicator value={Number(getValue())} /> },
    { accessorKey: "risk", header: "Riesgo", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
    { accessorKey: "compatibility", header: "Compatibilidad" },
    { accessorKey: "experience", header: "Experiencia" },
    { accessorKey: "financial", header: "Financiero" },
    { accessorKey: "legal", header: "Jurídico" },
    { accessorKey: "technical", header: "Técnico" },
    { accessorKey: "recommendation", header: "Recomendación", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
  ];
  return (
    <DataWorkspace
      title="Calificación y priorización"
      eyebrow="Bandeja"
      description="Puntajes 0-100, semáforo de riesgo y recomendaciones simuladas."
      chips={chips}
      onRemoveChip={(id) => setChips(chips.filter((chip) => chip.id !== id))}
      onClearChips={() => setChips([])}
      toolbar={
        <>
          <Button
            onClick={() =>
              openFlow({
                type: "filters-generic",
                title: "Filtros de calificación",
                size: "compact",
                payload: {
                  active: chips,
                  onApply: setChips,
                  fields: [{ field: "risk", label: "Riesgo", options: ["bajo", "medio", "alto", "critico"] }],
                },
              })
            }
          >
            Filtros
          </Button>
          <Button onClick={() => openFlow({ type: "weights", title: "Ponderaciones", size: "standard" })}>
            Criterios
          </Button>
        </>
      }
      list={<DataTable data={rows} columns={columns} selectedId={selectedId} onRowClick={(row) => setSelectedId(row.id)} />}
      detail={
        selected && (
          <ContextDetailPanel
            title={tender?.secopId ?? selected.id}
            actions={
              <Button size="sm" onClick={() => void assessmentsService.recalc(selected.tenderId)}>
                Recalcular
              </Button>
            }
          >
            <p className="text-sm">{selected.explanation}</p>
            {selected.blocked ? <p className="mt-2 text-sm text-red-700">{selected.blockReason}</p> : null}
            <p className="mt-2 text-xs text-muted">Confianza {selected.confidence} · v{selected.version}</p>
          </ContextDetailPanel>
        )
      }
    />
  );
}
