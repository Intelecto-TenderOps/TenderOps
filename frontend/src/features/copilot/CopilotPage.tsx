import { useMutation } from "@tanstack/react-query";
import { TenderOpsCopilot } from "@/components/copilot/TenderOpsCopilot";
import { copilotService } from "@/services/copilotService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function CopilotPage() {
  const messages = useDemoStore((state) => state.workspace.copilotThread);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const ask = useMutation({ mutationFn: (value: string) => copilotService.ask(value) });
  return (
    <section className="glass-panel flex min-h-[70vh] flex-col rounded-[28px] p-5">
      <header className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Copilot Studio</p>
        <h1 className="text-3xl font-semibold">Orquestador de demostración</h1>
        <p className="text-sm text-muted">
          Conversaciones y hallazgos estructurados. No hay llamadas reales a Copilot Studio.
        </p>
      </header>
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
