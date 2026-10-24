import { useState } from "react";
import { DataWorkspace } from "@/components/data/DataWorkspace";
import { DataTable, RichMoney, RichPrimary, RichStage, RichValue, type RichColumn } from "@/components/data/DataTable";
import { ContextDetailPanel } from "@/components/data/ContextDetailPanel";
import { IntegrationNotice } from "@/components/status/IntegrationNotice";
import { Button } from "@/components/ui/button";
import type { CommercialOpportunity } from "@/contracts";
import { useFilterChips } from "@/hooks/useFilterChips";
import { useIntegrations } from "@/hooks/useIntegrations";
import { prettyLabel } from "@/lib/format";
import { findIntegration } from "@/lib/integration";
import { opportunitiesService } from "@/services/opportunitiesService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

const columns: RichColumn<CommercialOpportunity>[] = [
  {
    id: "oportunidad",
    header: "Oportunidad / cuenta",
    grow: true,
    sortValue: (row) => row.name,
    cell: (row) => (
      <RichPrimary kicker={row.dynamicsOpportunityId} title={row.name} detail={`${row.account} · ${row.dynamicsAccountId}`} />
    ),
  },
  {
    id: "presupuesto",
    header: "Presupuesto",
    sortValue: (row) => row.value,
    cell: (row) => <RichMoney value={row.value} hint={row.owner} />,
  },
  {
    id: "etapa",
    header: "Etapa",
    sortValue: (row) => row.stage,
    cell: (row) => <RichStage label={row.stage} />,
  },
  {
    id: "estado",
    header: "Estado",
    sortValue: (row) => row.status,
    cell: (row) => (
      <RichValue
        primary={prettyLabel(row.status)}
        secondary={row.outcome ? prettyLabel(row.outcome) : `${row.activities} actividades`}
      />
    ),
  },
];

export function OportunidadesPage() {
  const { chips, setChips } = useFilterChips();
  const opportunities = useDemoStore((state) => state.workspace.opportunities);
  const tenders = useDemoStore((state) => state.workspace.tenders);
  const integrations = useIntegrations();
  const dynamics = findIntegration(integrations.data?.items, "Dynamics 365");
  const dynamicsReady = dynamics?.configured === true;
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
      description="Una licitación detectada no es todavía una oportunidad comercial."
      notice={
        <IntegrationNotice
          title={dynamicsReady ? "Dynamics 365 configurado" : "Dynamics 365 no configurado"}
          detail="No se crea Opportunity ni se afirma un GUID comercial sin credenciales."
        />
      }
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
                <Button
                  size="sm"
                  onClick={() => void opportunitiesService.close(selected.dynamicsOpportunityId ?? selected.id, "ganada")}
                >
                  Cerrar ganada
                </Button>
              ) : null
            }
          >
            <p className="text-sm">Cuenta Dynamics: {selected.dynamicsAccountId}</p>
            <p className="text-sm">Proceso origen: {origin?.secopId ?? "sin vincular"}</p>
            <p className="text-sm">Actividades {selected.activities} · tareas {selected.tasks} · documentos {selected.documents}</p>
            <p className="mt-2 text-xs text-muted">
              Diferencia: el proceso SECOP vive en TenderOps; el registro comercial solo existe si Dynamics responde.
            </p>
          </ContextDetailPanel>
        )
      }
    />
  );
}
