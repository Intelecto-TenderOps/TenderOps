import { describe, expect, it } from "vitest";
import { resetEnvCache } from "../src/config/env.js";
import { handleApiRequest } from "../src/http/handler.js";

describe("API", () => {
  it("salud y estado de integraciones", async () => {
    const health = await handleApiRequest({
      method: "GET",
      path: "/api/v1/health",
      url: "http://local/api/v1/health",
      headers: {},
      query: {},
    });
    expect(health.status).toBe(200);
    const integrations = await handleApiRequest({
      method: "GET",
      path: "/api/v1/admin/integrations",
      url: "http://local/api/v1/admin/integrations",
      headers: {},
      query: {},
    });
    const body = integrations.body as { items: { name: string; status: string }[] };
    expect(body.items.find((item) => item.name === "dynamics")?.status).toBe("unconfigured");
  });

  it("no permite consultar otra empresa", async () => {
    const response = await handleApiRequest({
      method: "GET",
      path: "/api/v1/companies/co-b",
      url: "http://local/api/v1/companies/co-b",
      headers: { "x-company-id": "co-a" },
      query: {},
    });
    expect(response.status).toBe(403);
  });

  it("expone estado SECOP sin filtrar el token", async () => {
    const response = await handleApiRequest({
      method: "GET",
      path: "/api/v1/secop/status",
      url: "http://local/api/v1/secop/status",
      headers: {},
      query: {},
    });
    expect(response.status).toBe(200);
    const body = response.body as { tokenConfigured: boolean; catalog: { size: number } };
    expect(typeof body.tokenConfigured).toBe("boolean");
    expect(body.catalog).toBeTruthy();
    const dumped = JSON.stringify(body);
    const token = process.env.SOCRATA_APP_TOKEN;
    if (token) expect(dumped).not.toContain(token);
  });

  it("exige cron secret en /secop/sync cuando está configurado", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    resetEnvCache();
    const denied = await handleApiRequest({
      method: "GET",
      path: "/api/v1/secop/sync",
      url: "http://local/api/v1/secop/sync",
      headers: {},
      query: {},
    });
    expect(denied.status).toBe(401);
    delete process.env.CRON_SECRET;
    resetEnvCache();
  });
});
