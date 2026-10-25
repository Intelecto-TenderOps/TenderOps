import { beforeEach, describe, expect, it } from "vitest";
import { login, request, setupTestEnv } from "./helpers.js";
import { DEMO_COMPANY_A, DEMO_COMPANY_B } from "../src/app/container.js";

beforeEach(() => {
  setupTestEnv();
});

describe("authentication and isolation", () => {
  it("rejects anonymous private routes", async () => {
    const response = await request("GET", "/api/session");
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: "authentication_required" });
    expect(response.body).toHaveProperty("correlationId");
  });

  it("issues a demo token and returns authorized companies", async () => {
    const token = await login("admin");
    const session = await request("GET", "/api/session", { token });
    expect(session.status).toBe(200);
    expect(session.body.companies[0].id).toBe(DEMO_COMPANY_A);
    expect(session.body.companies[0].permissions).toContain("profile.read");
  });

  it("isolates companies across identities", async () => {
    const admin = await login("admin");
    const other = await login("other");
    const created = await request("POST", `/api/v1/companies/${DEMO_COMPANY_A}/capability`, {
      token: admin,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: {
        name: "Ciberseguridad",
        description: "Auditoría técnica",
        countryCode: "CO",
        validUntil: "2030-01-01",
        active: true,
      },
    });
    expect(created.status).toBe(201);
    const id = created.body.id as string;
    const denied = await request("GET", `/api/v1/companies/${DEMO_COMPANY_A}/capability/${id}`, { token: other });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("company_access_denied");
    const otherCompany = await request("GET", `/api/v1/companies/${DEMO_COMPANY_B}/company/${DEMO_COMPANY_B}`, { token: other });
    expect(otherCompany.status).toBe(200);
  });

  it("enforces If-Match and idempotency", async () => {
    const token = await login("admin");
    const key = crypto.randomUUID();
    const body = {
      name: "Nube",
      description: "Operación",
      countryCode: "CO",
      validUntil: "2030-01-01",
      active: true,
    };
    const first = await request("POST", `/api/v1/companies/${DEMO_COMPANY_A}/capability`, {
      token,
      headers: { "idempotency-key": key },
      body,
    });
    const replay = await request("POST", `/api/v1/companies/${DEMO_COMPANY_A}/capability`, {
      token,
      headers: { "idempotency-key": key },
      body,
    });
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(first.body.id);
    const conflict = await request("PUT", `/api/v1/companies/${DEMO_COMPANY_A}/capability/${first.body.id}`, {
      token,
      headers: { "idempotency-key": crypto.randomUUID() },
      body,
    });
    expect(conflict.status).toBe(428);
  });

  it("does not grant financial read to administrators by default", async () => {
    const token = await login("admin");
    const denied = await request("GET", `/api/v1/companies/${DEMO_COMPANY_A}/financial`, { token });
    expect(denied.status).toBe(403);
  });
});
