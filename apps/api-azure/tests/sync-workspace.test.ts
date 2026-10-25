import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../src/store/memory.js";
import { cleanupCatalog, shouldRetain } from "../src/domains/secop/sync.js";
import { normalizeSecop } from "../src/domains/secop/normalize.js";
import { SECOP_II_FIELDS } from "../src/clients/secop.js";
import { CompanyService } from "../src/domains/companies/service.js";
import { WorkspaceService } from "../src/domains/workspace/service.js";
import { setupTestEnv } from "./helpers.js";
import { demoActor } from "../src/app/container.js";

beforeEach(() => {
  setupTestEnv();
});

describe("catalog retention", () => {
  it("removes stale non-relevant processes and keeps relevant ones", async () => {
    const store = new MemoryStore();
    const stale = normalizeSecop({
      source: "SECOP II",
      dataset: "p6dx-8zbt",
      fields: {
        [SECOP_II_FIELDS.id]: "OLD",
        [SECOP_II_FIELDS.title]: "Histórico",
        [SECOP_II_FIELDS.updatedAt]: "2024-01-01T00:00:00Z",
        [SECOP_II_FIELDS.publishedAt]: "2024-01-01T00:00:00Z",
      },
    });
    const watched = { ...stale, id: "keep", externalId: "KEEP", relevant: true };
    await store.upsertProcess({ ...stale, relevant: false });
    await store.upsertProcess(watched);
    const result = await cleanupCatalog(store, new Date("2026-10-25T00:00:00Z"));
    expect(result.removed).toBe(1);
    expect(result.kept).toBe(1);
    expect(await store.getProcess("keep")).not.toBeNull();
    expect(shouldRetain(stale.updatedAt, 90, false, new Date("2026-10-25T00:00:00Z"))).toBe(false);
  });
});

describe("workspace rules", () => {
  it("does not create a Dynamics opportunity without a BID decision", async () => {
    const store = new MemoryStore();
    const companies = new CompanyService(store);
    const workspace = new WorkspaceService(store, companies);
    const admin = demoActor("admin");
    const company = await companies.createCompany(admin, { legalName: "Andina", countryCode: "CO", taxId: "900" }, crypto.randomUUID(), "t");
    await expect(
      workspace.createOpportunity(admin, company.id, {
        tenderId: "t1",
        dynamicsOpportunityId: "dyn-1",
        dynamicsAccountId: "acc-1",
        account: "MinTIC",
        name: "Oportunidad",
        value: 1,
        owner: admin.name,
        stage: "calificación",
        status: "abierta",
        outcome: null,
      }),
    ).rejects.toMatchObject({ code: "bid_required" });
  });
});
