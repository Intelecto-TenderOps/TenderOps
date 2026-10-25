import { issueDemoToken } from "../shared/auth.js";
import { loadConfig } from "../shared/config.js";
import { DomainError } from "../shared/errors.js";
import { stableId } from "../shared/ids.js";
import type { Actor } from "../shared/types.js";
import { CompanyService } from "../domains/companies/service.js";
import { WorkspaceService } from "../domains/workspace/service.js";
import { MemoryStore } from "../store/memory.js";
import type { BusinessStore } from "../store/types.js";

export const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";
export const DEMO_USERS: Record<string, { objectId: string; name: string; roles: string[]; company: "A" | "B" }> = {
  admin: { objectId: "22222222-2222-2222-2222-222222222222", name: "Demostración · Administrador", roles: ["Administrator"], company: "A" },
  analyst: { objectId: "33333333-3333-3333-3333-333333333333", name: "Demostración · Analista", roles: ["Analyst"], company: "A" },
  finance: { objectId: "44444444-4444-4444-4444-444444444444", name: "Demostración · Financiero", roles: ["Financial"], company: "A" },
  approver: { objectId: "55555555-5555-5555-5555-555555555555", name: "Demostración · Aprobador", roles: ["Approver"], company: "A" },
  other: { objectId: "66666666-6666-6666-6666-666666666666", name: "Demostración · Otra empresa", roles: ["Administrator"], company: "B" },
};

export const DEMO_COMPANY_A = stableId("company:CO:DEMO-A");
export const DEMO_COMPANY_B = stableId("company:CO:DEMO-B");

export interface AppContainer {
  store: BusinessStore;
  companies: CompanyService;
  workspace: WorkspaceService;
}

let singleton: AppContainer | undefined;

export function createContainer(store = new MemoryStore()): AppContainer {
  const companies = new CompanyService(store);
  return { store, companies, workspace: new WorkspaceService(store, companies) };
}

export function getContainer(): AppContainer {
  if (!singleton) singleton = createContainer();
  return singleton;
}

export function resetContainer(): void {
  singleton = undefined;
}

export function demoActor(alias: string): Actor {
  const user = DEMO_USERS[alias];
  if (!user) throw new DomainError(400, "invalid_demo_user");
  return { tenantId: DEMO_TENANT, objectId: user.objectId, name: user.name, key: `${DEMO_TENANT}:${user.objectId}` };
}

export async function seedDemo(container = getContainer()): Promise<void> {
  const config = loadConfig();
  if (!config.demoEnabled) return;
  const admin = demoActor("admin");
  const other = demoActor("other");
  try {
    await container.companies.createCompany(admin, { legalName: "Andina Tecnología S.A.S.", countryCode: "CO", taxId: "DEMO-A" }, stableId("seed-a"), "demo-seed");
  } catch (error) {
    if (!(error instanceof DomainError) || error.code !== "company_already_registered") throw error;
  }
  try {
    await container.companies.createCompany(other, { legalName: "Oriente Soluciones S.A.S.", countryCode: "CO", taxId: "DEMO-B" }, stableId("seed-b"), "demo-seed");
  } catch (error) {
    if (!(error instanceof DomainError) || error.code !== "company_already_registered") throw error;
  }
  for (const alias of ["analyst", "finance", "approver"] as const) {
    const user = DEMO_USERS[alias];
    if (!user) continue;
    try {
      await container.companies.save(
        admin,
        DEMO_COMPANY_A,
        "membership",
        null,
        { tenantId: DEMO_TENANT, objectId: user.objectId, roles: user.roles, active: true },
        null,
        stableId(`seed-${alias}`),
        "demo-seed",
      );
    } catch (error) {
      if (!(error instanceof DomainError) || !["membership_already_exists", "idempotency_conflict"].includes(error.code)) {
        // Seed is idempotent by command id; ignore duplicates.
      }
    }
  }
}

export function demoToken(alias: string): string {
  return issueDemoToken(demoActor(alias), loadConfig().demoTokenSecret);
}
