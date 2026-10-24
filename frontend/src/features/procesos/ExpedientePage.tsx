import { NavLink, Outlet, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IntegrationNotice } from "@/components/status/IntegrationNotice";
import { ScoreIndicator } from "@/components/viz/ScoreIndicator";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useLiveTender } from "@/hooks/useLiveTender";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDrawerStore } from "@/store/drawer-store";

export function ExpedienteLayout() {
  const { id = "" } = useParams();
  const workspace = useWorkspace();
  const { tender, live } = useLiveTender(id);
  const assessment = workspace.assessments.find((item) => item.tenderId === tender?.id);
  const openFlow = useDrawerStore((state) => state.openFlow);
  if (!tender) {
    return (
      <p className="text-sm text-muted">
        {live.isFetching ? "Consultando SECOP…" : "Proceso no encontrado en SECOP ni en el lote local."}
      </p>
    );
  }
  const tabs = [
    { to: `/procesos/${tender.secopId}`, label: "Resumen", end: true },
    { to: `/procesos/${tender.secopId}/analisis`, label: "Análisis" },
    { to: `/procesos/${tender.secopId}/documentos`, label: "Documentos" },
    { to: `/procesos/${tender.secopId}/requisitos`, label: "Requisitos" },
    { to: `/procesos/${tender.secopId}/matriz`, label: "Matriz" },
    { to: `/procesos/${tender.secopId}/decision`, label: "Decisión" },
    { to: `/procesos/${tender.secopId}/preparacion`, label: "Preparación" },
    { to: `/procesos/${tender.secopId}/actividad`, label: "Actividad" },
    { to: `/procesos/${tender.secopId}/historial`, label: "Historial" },
  ];
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="glass-panel rounded-[20px] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-corporate">{tender.secopId}</p>
            <h1 className="text-[17px] font-semibold leading-tight">{tender.object}</h1>
            <p className="text-xs text-muted">
              {tender.entity} · {formatCurrency(tender.value)} · cierra {formatDateTime(tender.closesAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={tender.recommendation} />
            {assessment ? <ScoreIndicator value={assessment.score} /> : null}
            <Button
              onClick={() =>
                openFlow({
                  type: "record-decision",
                  title: "Registrar decisión",
                  recordId: tender.id,
                  steps: ["Decisión", "Justificación", "Confirmación"],
                })
              }
            >
              Decidir
            </Button>
          </div>
        </div>
        <nav className="mt-2 flex flex-wrap gap-2" aria-label="Pestañas del expediente">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-sm ${isActive ? "bg-electric text-white" : "bg-white/60"}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet context={tender} />
    </section>
  );
}

export function ExpedienteResumen() {
  const { id = "" } = useParams();
  const workspace = useWorkspace();
  const { tender, live } = useLiveTender(id);
  const assessment = workspace.assessments.find((item) => item.tenderId === tender?.id);
  if (!tender) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <article className="glass-panel rounded-[24px] p-4">
        <h2 className="font-semibold">Análisis</h2>
        {assessment ? (
          <>
            <p className="mt-2 text-sm">{assessment.explanation}</p>
            <p className="mt-2 text-xs text-muted">Confianza {assessment.confidence} · versión {assessment.version}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No hay evaluación persistida. Copilot Studio y Dataverse no están configurados; no se inventa un encaje.
          </p>
        )}
      </article>
      <article className="glass-panel rounded-[24px] p-4">
        <h2 className="font-semibold">Identificadores</h2>
        <dl className="mt-2 grid gap-1 text-sm">
          <div>TenderOps: {tender.tenderOpsId}</div>
          <div>SECOP: {tender.secopId}</div>
          <div>Dynamics: {tender.dynamicsOpportunityId ?? "sin crear"}</div>
        </dl>
        <div className="mt-3">
          <IntegrationNotice
            title={live.data && "simulated" in live.data && live.data.simulated === false ? "Ficha SECOP en vivo" : "Ficha local"}
            detail="Crear oportunidad o evaluar con IA exige Dynamics/Copilot configurados."
          />
        </div>
      </article>
    </div>
  );
}
