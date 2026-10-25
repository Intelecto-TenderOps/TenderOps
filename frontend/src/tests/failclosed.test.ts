import { afterEach, describe, expect, it, vi } from "vitest";
import { copilotService } from "@/services/copilotService";
import { opportunitiesService } from "@/services/opportunitiesService";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("servicios fail-closed", () => {
  it("no inventa una respuesta de Copilot Studio", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        jsonResponse(503, {
          error: {
            code: "integration_unconfigured",
            integration: "copilot",
            message: "Copilot Studio gateway.",
            missing: ["COPILOT_CONNECTION_STRING"],
          },
        }),
      ),
    );
    const result = await copilotService.ask("¿Debo ir BID?");
    expect(result.ok).toBe(false);
    expect(result.unconfigured).toBe(true);
    expect(result.integration).toBe("copilot");
  });

  it("no crea un GUID Dynamics falso al fallar la oportunidad", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        jsonResponse(503, {
          error: {
            code: "integration_unconfigured",
            integration: "dynamics",
            message: "Dynamics 365 Sales Web API.",
            missing: ["DYNAMICS_BASE_URL"],
          },
        }),
      ),
    );
    const result = await opportunitiesService.create({
      tenderId: "tnd-001",
      name: "Proceso de prueba",
      value: 1000,
      secopId: "CO1.REQ.TEST",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected fail-closed Dynamics");
    expect(result.unconfigured).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/D365-OPP/);
  });
});
