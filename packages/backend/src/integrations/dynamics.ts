import { loadEnv } from "../config/env.js";
import { DataverseClient } from "./dataverse.js";
import { requireConfigured } from "./status.js";

export class Dynamics365Client {
  constructor(
    private readonly env = loadEnv(),
    private readonly dataverse = new DataverseClient(),
  ) {}

  status() {
    return requireConfigured("dynamics");
  }

  async findAccountByNit(nit: string) {
    const gate = this.status();
    if (!gate.ok) return gate;
    return this.dataverse.request(`accounts?$filter=contains(accountnumber,'${nit.replaceAll("'", "''")}')&$top=5`);
  }

  async createOpportunity(input: {
    name: string;
    estimatedvalue?: number;
    parentaccountid?: string;
    secopId?: string;
  }) {
    const gate = this.status();
    if (!gate.ok) return gate;
    return this.dataverse.request("opportunities", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        estimatedvalue: input.estimatedvalue,
        "victor.secopid": input.secopId,
      }),
    });
  }

  async createTask(input: { subject: string; regardingobjectid?: string }) {
    const gate = this.status();
    if (!gate.ok) return gate;
    return this.dataverse.request("tasks", {
      method: "POST",
      body: JSON.stringify({ subject: input.subject }),
    });
  }
}
