import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ComplianceMatrix } from "@/components/compliance/ComplianceMatrix";
import { ContextDetailPanel } from "@/components/data/ContextDetailPanel";
import { Button } from "@/components/ui/button";
import { ActiveFilterChips } from "@/components/selection";
import { ProgressRing } from "@/components/viz/ProgressRing";
import { StatusBadge } from "@/components/viz/StatusBadge";
import type { FilterChip } from "@/contracts";
import { matrixProgress } from "@/services/complianceService";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDrawerStore } from "@/store/drawer-store";

export function MatrizPage() {
  const { id = "" } = useParams();
  const workspace = useWorkspace();
  const tender = workspace.tenders.find((item) => item.secopId === id || item.id === id);
  const rows = useMemo(
    () => workspace.requirements.filter((item) => item.tenderId === tender?.id),
    [workspace.requirements, tender?.id],
  );
  const [selectedId, setSelectedId] = useState(rows[0]?.id);
  const [chips, setChips] = useState<FilterChip[]>([]);
  const [tick, setTick] = useState(0);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const hideDetail = useDrawerStore((state) => state.hiddenDetail);
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        chips.every((chip) => String(row[chip.field as keyof typeof row]) === chip.value),
      ),
    [rows, chips],
  );
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const progress = matrixProgress(filtered);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ProgressRing value={progress.cumple} label="Cumplimiento" />
          <div>
            <h2 className="text-lg font-semibold">Matriz de cumplimiento</h2>
            <p className="text-sm text-muted">
              {filtered.length} requisitos · copiado {progress.copiedReady}% · recálculo local #{tick}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              openFlow({
                type: "filters-generic",
                title: "Filtros de matriz",
                size: "compact",
                payload: {
                  active: chips,
                  onApply: setChips,
                  fields: [
                    { field: "category", label: "Categoría", options: ["jurídico", "financiero", "técnico", "experiencia"] },
                    { field: "owner", label: "Responsable", options: [...new Set(rows.map((item) => item.owner))] },
                    { field: "compliance", label: "Cumplimiento", options: ["cumple", "pendiente", "no_cumple"] },
                    { field: "status", label: "Estado", options: ["abierto", "en_revision", "cerrado"] },
                  ],
                },
              })
            }
          >
            Filtros
          </Button>
          <Button variant="primary" onClick={() => setTick((value) => value + 1)}>
            Actualizar
          </Button>
        </div>
      </div>
      <ActiveFilterChips
        chips={chips}
        onRemove={(chipId) => setChips((current) => current.filter((chip) => chip.id !== chipId))}
        onClear={() => setChips([])}
      />
      <div className="grid min-h-0 min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        <div className="table-surface min-w-0 overflow-hidden rounded-[24px]">
          <ComplianceMatrix
            rows={filtered}
            selectedId={selected?.id}
            onSelect={(row) => setSelectedId(row.id)}
          />
        </div>
        {!hideDetail && selected ? (
          <ContextDetailPanel
            title={selected.code}
            actions={
              <Button
                size="sm"
                onClick={() =>
                  openFlow({
                    type: "edit-requirement",
                    title: "Editar requisito",
                    recordId: selected.id,
                    size: "standard",
                  })
                }
              >
                Editar
              </Button>
            }
          >
            <p className="text-sm">{selected.requirement}</p>
            <p className="mt-2 text-xs text-muted">{selected.condition}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={selected.compliance} />
              <StatusBadge value={selected.copied} />
            </div>
            <p className="mt-3 text-sm">Responsable: {selected.owner}</p>
            <p className="text-sm text-muted">{selected.notes || "Sin observaciones"}</p>
          </ContextDetailPanel>
        ) : null}
      </div>
    </section>
  );
}
