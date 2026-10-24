import { describe, expect, it } from "vitest";
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
});
