import { PageHeader } from "@/components/data/PageHeader";
import { IntegrationNotice } from "@/components/status/IntegrationNotice";
import { useMutation } from "@tanstack/react-query";
import { TenderOpsCopilot } from "@/components/copilot/TenderOpsCopilot";
import { useCopilotAgents, useIntegrations } from "@/hooks/useIntegrations";
import { findIntegration } from "@/lib/integration";
import { copilotService } from "@/services/copilotService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function CopilotPage() {
  const messages = useDemoStore((state) => state.workspace.copilotThread);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const integrations = useIntegrations();
  const agents = useCopilotAgents();
  const copilot = findIntegration(integrations.data?.items, "Copilot Studio");
  const configured = copilot?.configured === true;
  const ask = useMutation({ mutationFn: (value: string) => copilotService.ask(value) });
  return (
    <section className="glass-panel flex min-h-[70vh] flex-col rounded-[28px] p-4">
      <div className="mb-3 grid gap-2">
        <PageHeader eyebrow="Copilot Studio" title="Orquestador TenderOps" />
        <IntegrationNotice
          title={configured ? "Copilot Studio configurado" : "Copilot Studio no configurado"}
          detail={
            configured
              ? copilot?.note
              : `Sin credenciales no se ejecuta ningún agente. ${agents.data?.items.length ? `Agentes declarados: ${agents.data.items.map((item) => item.name).join(", ")}.` : "El catálogo de agentes se lee de la API cuando está disponible."}`
          }
        />
      </div>
      <TenderOpsCopilot
        messages={messages}
        busy={ask.isPending}
        onAsk={(value) => ask.mutate(value)}
        onAction={(message) =>
          openFlow({
            type: "assign-owners",
            title: message.proposedAction?.label ?? "Asignar",
            size: "compact",
            payload: message.proposedAction?.payload,
          })
        }
      />
    </section>
  );
}
