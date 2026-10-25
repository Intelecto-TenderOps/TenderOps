import { DefaultAzureCredential } from "@azure/identity";
import { integrationReady, loadConfig } from "../shared/config.js";
import { DomainError } from "../shared/errors.js";

export class DataverseClient {
  constructor(private readonly now = () => new Date()) {}

  enabled(): boolean {
    return integrationReady("dataverse");
  }

  private async token(): Promise<string> {
    const config = loadConfig();
    if (!this.enabled()) throw new DomainError(503, "dataverse_not_configured");
    const credential = new DefaultAzureCredential();
    const scope = `${config.dataverseUrl.replace(/\/$/, "")}/.default`;
    const result = await credential.getToken(scope);
    if (!result?.token) throw new DomainError(503, "dataverse_permission_denied");
    return result.token;
  }

  table(kind: string): string {
    return `${loadConfig().dataversePrefix}_${kind}s`;
  }

  field(name: string): string {
    return `${loadConfig().dataversePrefix}_${name}`;
  }

  async query(path: string, signal?: AbortSignal): Promise<Record<string, unknown>[]> {
    const config = loadConfig();
    if (path.startsWith("http")) throw new Error("Relative paths only");
    const token = await this.token();
    const url = `${config.dataverseUrl.replace(/\/$/, "")}/api/data/v9.2/${path}`;
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        "odata-version": "4.0",
        "odata-maxversion": "4.0",
      },
      signal,
    });
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "2");
      throw new DomainError(503, "dataverse_http_429", true, Number.isFinite(retryAfter) ? retryAfter : 2);
    }
    if (!response.ok) {
      throw new DomainError(
        response.status === 404 ? 404 : 502,
        `dataverse_http_${response.status}`,
        response.status === 429 || response.status >= 500,
      );
    }
    const body = (await response.json()) as { value?: Record<string, unknown>[] };
    return body.value ?? [body as Record<string, unknown>];
  }

  async upsert(kind: string, id: string, payload: Record<string, unknown>, etag?: string): Promise<void> {
    const token = await this.token();
    const config = loadConfig();
    const url = `${config.dataverseUrl.replace(/\/$/, "")}/api/data/v9.2/${this.table(kind)}(${id})`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "if-match": etag ?? "*",
        "odata-version": "4.0",
      },
      body: JSON.stringify(payload),
    });
    if (response.status === 404) {
      const create = await fetch(`${config.dataverseUrl.replace(/\/$/, "")}/api/data/v9.2/${this.table(kind)}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "if-none-match": "*",
        },
        body: JSON.stringify({ ...payload, [`${this.field(kind)}id`]: id }),
      });
      if (!create.ok) throw new DomainError(502, `dataverse_http_${create.status}`, create.status >= 500);
      return;
    }
    if (!response.ok) throw new DomainError(response.status === 412 ? 412 : 502, `dataverse_http_${response.status}`);
  }
}

export const dataverseClient = new DataverseClient();
