import { DefaultAzureCredential } from "@azure/identity";
import { integrationReady, loadConfig } from "../shared/config.js";
import { DomainError } from "../shared/errors.js";

export interface DynamicsAccount {
  accountid: string;
  name: string;
  accountnumber?: string;
}

export interface DynamicsOpportunity {
  opportunityid: string;
  name: string;
  parentaccountid?: string;
}

export interface DynamicsTask {
  activityid: string;
  subject: string;
}

export class DynamicsClient {
  enabled(): boolean {
    return integrationReady("dynamics");
  }

  private require(): void {
    if (!this.enabled()) throw new DomainError(503, "dynamics_not_configured");
  }

  private async token(): Promise<string> {
    this.require();
    const config = loadConfig();
    const credential = new DefaultAzureCredential();
    const result = await credential.getToken(`${config.dynamicsUrl.replace(/\/$/, "")}/.default`);
    if (!result?.token) throw new DomainError(503, "dynamics_permission_denied");
    return result.token;
  }

  private async send(path: string, init: RequestInit = {}): Promise<Response> {
    const config = loadConfig();
    const token = await this.token();
    const response = await fetch(`${config.dynamicsUrl.replace(/\/$/, "")}/api/data/v9.2/${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        "content-type": "application/json",
        "odata-version": "4.0",
        ...(init.headers ?? {}),
      },
    });
    if (response.status === 429) throw new DomainError(503, "dynamics_rate_limited", true);
    return response;
  }

  async findAccounts(query: string): Promise<DynamicsAccount[]> {
    const encoded = encodeURIComponent(query.replaceAll("'", "''"));
    const response = await this.send(`accounts?$select=accountid,name,accountnumber&$filter=contains(name,'${encoded}')`);
    if (!response.ok) throw new DomainError(502, `dynamics_http_${response.status}`, true);
    const body = (await response.json()) as { value: DynamicsAccount[] };
    return body.value;
  }

  async findContacts(accountId: string): Promise<Record<string, unknown>[]> {
    const response = await this.send(`contacts?$select=contactid,fullname,emailaddress1&$filter=_parentcustomerid_value eq ${accountId}`);
    if (!response.ok) throw new DomainError(502, `dynamics_http_${response.status}`, true);
    const body = (await response.json()) as { value: Record<string, unknown>[] };
    return body.value;
  }

  async createOpportunity(input: { name: string; accountId: string; secopId: string }): Promise<DynamicsOpportunity> {
    const response = await this.send("opportunities", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        "parentaccountid@odata.bind": `/accounts(${input.accountId})`,
        tno_secopid: input.secopId,
      }),
    });
    if (!response.ok) throw new DomainError(502, `dynamics_http_${response.status}`, true);
    const entityId = response.headers.get("odata-entityid") ?? "";
    const opportunityid = entityId.match(/\(([^)]+)\)/)?.[1] ?? crypto.randomUUID();
    return { opportunityid, name: input.name, parentaccountid: input.accountId };
  }

  async updateOpportunity(id: string, fields: Record<string, unknown>): Promise<void> {
    const response = await this.send(`opportunities(${id})`, { method: "PATCH", body: JSON.stringify(fields) });
    if (!response.ok) throw new DomainError(502, `dynamics_http_${response.status}`, true);
  }

  async createTask(input: { subject: string; opportunityId?: string; owner?: string; due?: string }): Promise<DynamicsTask> {
    const response = await this.send("tasks", {
      method: "POST",
      body: JSON.stringify({
        subject: input.subject,
        scheduledend: input.due,
        ...(input.opportunityId ? { "regardingobjectid_opportunity@odata.bind": `/opportunities(${input.opportunityId})` } : {}),
      }),
    });
    if (!response.ok) throw new DomainError(502, `dynamics_http_${response.status}`, true);
    return { activityid: crypto.randomUUID(), subject: input.subject };
  }
}

export const dynamicsClient = new DynamicsClient();
