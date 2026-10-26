import { PageHeader } from "@/components/data/PageHeader";
import { useMutation } from "@tanstack/react-query";
import { TenderOpsCopilot } from "@/components/copilot/TenderOpsCopilot";
import { copilotService } from "@/services/copilotService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function CopilotPage() {
  const messages = useDemoStore((state) => state.workspace.copilotThread);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const ask = useMutation({ mutationFn: (value: string) => copilotService.ask(value, "candidatos") });
  return (
    <section className="glass-panel flex min-h-[70vh] flex-col rounded-[28px] p-4">
      <div className="mb-3">
        <PageHeader eyebrow="Copilot Studio" title="Agente de Candidatos" />
        <p className="mt-1 text-sm text-muted">La evaluación determinista se calcula en el banco de perfiles. Copilot Studio no inventa experiencia ni certificaciones.</p>
      </div>
      <TenderOpsCopilot
        messages={messages}
        busy={ask.isPending}
        onAsk={(value) => ask.mutate(value)}
        onAction={(message) =>
          openFlow({
            type: message.proposedAction?.type ?? "assign-owners",
            title: message.proposedAction?.label ?? "Asignar",
            size: message.proposedAction?.type === "select-professional" ? "wide" : "compact",
            payload: message.proposedAction?.payload,
          })
        }
      />
    </section>
  );
}
