import { useMemo, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataWorkspace } from "@/components/data/DataWorkspace";
import { DataTable } from "@/components/data/DataTable";
import { ContextDetailPanel } from "@/components/data/ContextDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SelectedItemsBar } from "@/components/selection";
import { ScoreIndicator } from "@/components/viz/ScoreIndicator";
import { StatusBadge } from "@/components/viz/StatusBadge";
import type { Tender } from "@/contracts";
import { useFilterChips } from "@/hooks/useFilterChips";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { chipsToFilters, filterTenders, tendersService } from "@/services/tendersService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";
import { useUiStore } from "@/store/ui-store";

const columns: ColumnDef<Tender>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        aria-label="Seleccionar todos"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        aria-label={`Seleccionar ${row.original.secopId}`}
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(event) => event.stopPropagation()}
      />
    ),
  },
  { accessorKey: "secopId", header: "Identificador" },
  { accessorKey: "entity", header: "Entidad" },
  { accessorKey: "object", header: "Objeto" },
  { accessorKey: "modality", header: "Modalidad" },
  {
    accessorKey: "value",
    header: "Valor",
    cell: ({ getValue }) => formatCurrency(Number(getValue())),
  },
  { accessorKey: "department", header: "Ubicación" },
  {
    accessorKey: "closesAt",
    header: "Cierre",
    cell: ({ getValue }) => formatDateTime(String(getValue())),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ getValue }) => <StatusBadge value={String(getValue())} />,
  },
  { accessorKey: "source", header: "Fuente" },
  {
    accessorKey: "compatibility",
    header: "Compatibilidad",
    cell: ({ getValue }) => <ScoreIndicator value={Number(getValue())} />,
  },
  {
    accessorKey: "risk",
    header: "Riesgo",
    cell: ({ getValue }) => <StatusBadge value={String(getValue())} />,
  },
];

export function ExplorarPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { chips, setChips } = useFilterChips();
  const openFlow = useDrawerStore((state) => state.openFlow);
  const density = useUiStore((state) => state.density);
  const setDensity = useUiStore((state) => state.setDensity);
  const hideDetail = useDrawerStore((state) => state.hiddenDetail);
  const tenders = useDemoStore((state) => state.workspace.tenders);
  const search = params.get("q") ?? "";
  const [selectedId, setSelectedId] = useState(tenders[0]?.id);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selected = tenders.find((item) => item.id === selectedId) ?? tenders[0];
  const rows = useMemo(
    () => filterTenders(tenders, { ...chipsToFilters(chips), search }),
    [tenders, chips, search],
  );
  const selectedRows = rows.filter((item) => rowSelection[item.id]);

  return (
    <DataWorkspace
      eyebrow="Exploración"
      title="Licitaciones SECOP"
      description="Listado amplio y detalle contextual. Los filtros y las acciones se ejecutan en el panel lateral."
      dense={density === "compact"}
      chips={chips}
      onRemoveChip={(id) => setChips(chips.filter((chip) => chip.id !== id))}
      onClearChips={() => setChips([])}
      toolbar={
        <>
          <Input
            aria-label="Buscar procesos"
            placeholder="Buscar por objeto, entidad o SECOP"
            value={search}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              if (event.target.value) next.set("q", event.target.value);
              else next.delete("q");
              setParams(next, { replace: true });
            }}
          />
          <Button
            id="open-tender-filters"
            onClick={() =>
              openFlow(
                {
                  type: "filters-tenders",
                  title: "Filtros de exploración",
                  description: "Las etiquetas pendientes no afectan resultados hasta aplicar.",
                  size: "compact",
                  payload: {
                    active: chips,
                    onApply: setChips,
                  },
                },
                "open-tender-filters",
              )
            }
          >
            Filtros
          </Button>
          <Button onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}>
            Densidad
          </Button>
          <Button
            onClick={() =>
              openFlow({
                type: "save-search",
                title: "Guardar búsqueda",
                size: "compact",
                payload: { filters: chipsToFilters(chips) },
              })
            }
          >
            Guardar búsqueda
          </Button>
        </>
      }
      selectionBar={
        <SelectedItemsBar
          noun="procesos"
          items={selectedRows.map((item) => ({ id: item.id, label: item.secopId }))}
          onRemove={(id) => setRowSelection((current) => ({ ...current, [id]: false }))}
          onClear={() => setRowSelection({})}
          actions={[
            {
              label: "Comparar",
              onClick: () =>
                openFlow({
                  type: "compare-tenders",
                  title: "Comparar procesos",
                  size: "wide",
                  payload: { ids: selectedRows.map((item) => item.id) },
                }),
            },
            {
              label: "Asignar",
              onClick: () =>
                openFlow({ type: "assign-owners", title: "Asignar analistas", size: "compact" }),
            },
            {
              label: "Clasificar",
              onClick: () => openFlow({ type: "classify-document", title: "Clasificar", size: "compact" }),
            },
            {
              label: "Exportar",
              onClick: () => {
                const blob = new Blob([JSON.stringify(selectedRows, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "procesos-demo.json";
                anchor.click();
                URL.revokeObjectURL(url);
              },
            },
          ]}
        />
      }
      list={
        <DataTable
          data={rows}
          columns={columns}
          selectedId={selectedId}
          enableSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      }
      detail={
        hideDetail || !selected ? undefined : (
          <ContextDetailPanel
            title="Detalle contextual"
            actions={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void tendersService.toggleFavorite(selected.id)}>
                  {selected.favorite ? "Quitar favorito" : "Favorito"}
                </Button>
                <Button size="sm" onClick={() => navigate(`/procesos/${selected.secopId}`)}>
                  Expediente
                </Button>
              </div>
            }
          >
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted">Proceso</dt>
                <dd className="font-semibold">{selected.secopId}</dd>
              </div>
              <div>
                <dt className="text-muted">Entidad</dt>
                <dd>{selected.entity}</dd>
              </div>
              <div>
                <dt className="text-muted">Objeto</dt>
                <dd>{selected.object}</dd>
              </div>
              <div>
                <dt className="text-muted">Valor</dt>
                <dd>{formatCurrency(selected.value)}</dd>
              </div>
              <div>
                <dt className="text-muted">Cierre</dt>
                <dd>{formatDateTime(selected.closesAt)}</dd>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    openFlow({
                      type: "create-opportunity",
                      title: "Registrar en Dynamics 365",
                      size: "standard",
                      steps: ["Origen", "Cuenta", "Confirmación"],
                      payload: { tenderId: selected.id },
                    })
                  }
                >
                  Crear oportunidad
                </Button>
                <Button size="sm" onClick={() => void tendersService.toggleWatch(selected.id)}>
                  {selected.watching ? "Dejar de seguir" : "Seguir"}
                </Button>
              </div>
            </dl>
          </ContextDetailPanel>
        )
      }
    />
  );
}
