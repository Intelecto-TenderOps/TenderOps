import { createId } from "@/lib/ids";
import type { CopilotMessage } from "@/contracts";
import { apiPost, isIntegrationUnconfigured, readIntegrationError } from "./http";
import { integrationsService } from "./integrationsService";
import { readWorkspace, writeWorkspace } from "./workspace";

function append(messages: CopilotMessage[]) {
  writeWorkspace((workspace) => ({
    ...workspace,
    copilotThread: [...workspace.copilotThread, ...messages],
  }));
}

export const copilotService = {
  async thread() {
    return readWorkspace().copilotThread;
  },
  async agents() {
    return integrationsService.agents();
  },
  async ask(body: string) {
    const user: CopilotMessage = {
      id: createId("cp"),
      role: "user",
      agent: "orquestador",
      body,
      createdAt: new Date().toISOString(),
    };
    append([user]);
    try {
      await apiPost("/api/v1/agent-executions", {
        schemaVersion: "1.0",
        action: "ASK",
        message: body,
      });
      append([
        {
          id: createId("cp"),
          role: "system",
          agent: "orquestador",
          body: "Copilot Studio respondió sin un contrato de salida utilizable. No se inventa un análisis.",
          createdAt: new Date().toISOString(),
          status: "error",
        },
      ]);
      return { ok: false as const, code: "empty_copilot_payload" };
    } catch (error) {
      const info = readIntegrationError(error);
      const unconfigured = isIntegrationUnconfigured(error);
      append([
        {
          id: createId("cp"),
          role: "assistant",
          agent: "orquestador",
          body: unconfigured
            ? "Copilot Studio no está configurado. TenderOps no simula una evaluación ni una recomendación generativa."
            : `No fue posible invocar Copilot Studio: ${info.message}`,
          createdAt: new Date().toISOString(),
          findings: info.missing.length ? info.missing.map((item) => `Falta ${item}`) : undefined,
          status: "error",
        },
      ]);
      return { ok: false as const, unconfigured, ...info };
    }
  },
};
