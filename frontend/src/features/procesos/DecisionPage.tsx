import { useParams } from "react-router-dom";
import { IntegrationNotice } from "@/components/status/IntegrationNotice";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { useLiveTender } from "@/hooks/useLiveTender";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function DecisionPage() {
  const { id = "" } = useParams();
  const workspace = useDemoStore((state) => state.workspace);
  const { tender } = useLiveTender(id);
  const decision = workspace.decisions.find((item) => item.tenderId === tender?.id);
  const processApprovals = workspace.approvals.filter((item) => item.tenderId === tender?.id);
  const processComments = workspace.comments.filter((item) => item.tenderId === tender?.id);
  const processEscalations = workspace.escalations.filter((item) => item.tenderId === tender?.id);
  const openFlow = useDrawerStore((state) => state.openFlow);
  if (!tender) return null;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <IntegrationNotice
          title="La decisión humana no se publica a Dataverse/Dynamics"
          detail="Sin credenciales, registrar BID no crea Opportunity. La recomendación de agente no se finge."
        />
      </div>
      <article className="glass-panel rounded-[24px] p-4">
        <h2 className="font-semibold">Recomendación</h2>
        <div className="mt-2">
          <StatusBadge value={decision?.recommended ?? tender.recommendation} />
        </div>
        <p className="mt-2 text-sm">{decision?.rationale}</p>
        <p className="mt-2 text-xs text-muted">
          {decision?.simulated ? "Recomendación de demostración, no es una decisión humana." : "Decisión registrada por un usuario de demostración."}
        </p>
        <Button
          className="mt-3"
          variant="primary"
          onClick={() =>
            openFlow({
              type: "record-decision",
              title: "Registrar decisión BID / NO BID",
              recordId: tender.id,
              steps: ["Decisión", "Justificación", "Confirmación"],
            })
          }
        >
          Registrar decisión
        </Button>
      </article>
      <article className="glass-panel rounded-[24px] p-4">
        <h2 className="font-semibold">Decisión humana</h2>
        <p className="mt-2 text-sm">
          {decision?.decided ? `${decision.decided} por ${decision.decidedBy}` : "Aún no hay decisión humana."}
        </p>
        <ul className="mt-3 grid gap-2">
          {processApprovals.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span>{item.discipline} · {item.reviewer}</span>
              <StatusBadge value={item.status} />
            </li>
          ))}
        </ul>
      </article>
      <article className="glass-panel rounded-[24px] p-4">
        <h2 className="font-semibold">Comentarios</h2>
        <ul className="mt-2 grid gap-2 text-sm">
          {processComments.map((item) => (
            <li key={item.id}>
              <strong>{item.author}</strong>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </article>
      <article className="glass-panel rounded-[24px] p-4">
        <h2 className="font-semibold">Escalaciones</h2>
        {processEscalations.length ? (
          processEscalations.map((item) => (
            <p key={item.id} className="text-sm">
              {item.reason} · {item.status}
            </p>
          ))
        ) : (
          <p className="text-sm text-muted">Sin escalaciones abiertas.</p>
        )}
      </article>
    </div>
  );
}
