import { useMemo, useState } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataWorkspace } from "@/components/data/DataWorkspace";
import { DataTable, RichDate, RichMoney, RichPrimary, RichScore, RichStage, type RichColumn } from "@/components/data/DataTable";
import { ContextDetailPanel } from "@/components/data/ContextDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SelectedItemsBar } from "@/components/selection";
import type { Tender } from "@/contracts";
import { useFilterChips } from "@/hooks/useFilterChips";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { chipsToFilters, filterTenders, tendersService } from "@/services/tendersService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function ExplorarPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { chips, setChips } = useFilterChips();
  const openFlow = useDrawerStore((state) => state.openFlow);
  const hideDetail = useDrawerStore((state) => state.hiddenDetail);
  const tenders = useDemoStore((state) => state.workspace.tenders);
  const assessments = useDemoStore((state) => state.workspace.assessments);
  const search = params.get("q") ?? "";
  const [selectedId, setSelectedId] = useState(tenders[0]?.id);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selected = tenders.find((item) => item.id === selectedId) ?? tenders[0];
  const rows = useMemo(
    () => filterTenders(tenders, { ...chipsToFilters(chips), search }),
    [tenders, chips, search],
  );
  const selectedRows = rows.filter((item) => rowSelection[item.id]);
  const columns = useMemo<RichColumn<Tender>[]>(
    () => [
      {
        id: "proceso",
        header: "Proceso / entidad",
        grow: true,
        sortValue: (row) => row.object,
        cell: (row) => (
          <RichPrimary
            kicker={`${row.secopId} · ${row.source}`}
            title={row.object}
            detail={`${row.entity} · ${row.department}`}
          />
        ),
      },
      {
        id: "presupuesto",
        header: "Presupuesto",
        sortValue: (row) => row.value,
        cell: (row) => <RichMoney value={row.value} hint={row.modality} />,
      },
      {
        id: "encaje",
        header: "Encaje",
        sortValue: (row) => row.compatibility,
        cell: (row) => {
          const confidence = assessments.find((item) => item.tenderId === row.id)?.confidence ?? row.compatibility;
          return <RichScore value={row.compatibility} hint={`Confianza ${confidence}%`} />;
        },
      },
      {
        id: "etapa",
        header: "Etapa",
        sortValue: (row) => row.status,
        cell: (row) => <RichStage label={row.status} />,
      },
      {
        id: "cierre",
        header: "Cierre",
        sortValue: (row) => row.closesAt,
        cell: (row) => <RichDate value={row.closesAt} />,
      },
    ],
    [assessments],
  );

  return (
    <DataWorkspace
      eyebrow="Exploración"
      title="Licitaciones SECOP"
      description="Listado amplio y detalle contextual. Los filtros y las acciones se ejecutan en el panel lateral."
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
