import { describe, expect, it } from "vitest";
import { ApiError, isIntegrationUnconfigured, readIntegrationError } from "@/services/http";
import { mapDependency, mapSecopSources } from "@/lib/integration";

describe("estado honesto de integraciones", () => {
  it("detecta integration_unconfigured y 503", () => {
    const error = new ApiError("API 503", 503, {
      error: { code: "integration_unconfigured", integration: "dynamics", message: "Dynamics 365 Sales Web API.", missing: ["DYNAMICS_BASE_URL"] },
    });
    expect(isIntegrationUnconfigured(error)).toBe(true);
    expect(readIntegrationError(error)).toMatchObject({
      integration: "dynamics",
      code: "integration_unconfigured",
      missing: ["DYNAMICS_BASE_URL"],
    });
  });

  it("mapea dependencias Microsoft como desconectadas sin credenciales", () => {
    const mapped = mapDependency({
      name: "dynamics",
      status: "unconfigured",
      verified: false,
      missing: ["DYNAMICS_BASE_URL"],
      message: "Dynamics 365 Sales Web API.",
    });
    expect(mapped.system).toBe("Dynamics 365");
    expect(mapped.status).toBe("desconectada");
    expect(mapped.configured).toBe(false);
  });

  it("mapea SECOP público como saludable cuando está available", () => {
    const mapped = mapDependency({
      name: "secop-public",
      status: "available",
      verified: true,
      missing: [],
      message: "Socrata público sin token; sujeto a cupos del proveedor.",
    });
    expect(mapped.system).toBe("SECOP");
    expect(mapped.status).toBe("saludable");
    expect(mapped.configured).toBe(true);
  });

  it("deriva fuentes SECOP sin exponer secretos", () => {
    const sources = mapSecopSources(
      [{ id: "SECOP_II", dataset: "p8tp-sa7f", searchMode: "hybrid" }],
      {
        mode: "hybrid",
        tokenConfigured: true,
        syncEnabled: true,
        pollIntervalMs: 60_000,
        lookbackHours: 24,
        catalog: { size: 12, lastSuccessAt: "2026-10-24T00:00:00Z", lastAttemptAt: "2026-10-24T00:00:00Z", lastError: null },
      },
    );
    expect(sources[0]?.name).toBe("SECOP II");
    expect(sources[0]?.health).toBe("ok");
    expect(JSON.stringify(sources)).not.toMatch(/token=|secret|SOCRATA/i);
  });
});
