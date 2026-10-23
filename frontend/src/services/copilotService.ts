import { createId } from "@/lib/ids";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export const copilotService = {
  async thread() {
    return simulateLatency(readWorkspace().copilotThread);
  },
  async ask(body: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      copilotThread: [
        ...workspace.copilotThread,
        {
          id: createId("cp"),
          role: "user",
          agent: "orquestador",
          body,
          createdAt: new Date().toISOString(),
        },
        {
          id: createId("cp"),
          role: "assistant",
          agent: "estrategia",
          body: "Respuesta simulada: revisa compatibilidad, evidencias y responsables antes de decidir BID.",
          createdAt: new Date().toISOString(),
          findings: ["Sin conexión real a Copilot Studio", "Los hallazgos usan el expediente local"],
          recommendation: "Abrir el flujo de asignación si falta un responsable.",
          status: "listo",
          proposedAction: {
            type: "assign-owners",
            label: "Asignar responsables",
            payload: { tenderId: "tnd-001" },
          },
        },
      ],
    }));
    return simulateLatency(true, 360);
  },
};
