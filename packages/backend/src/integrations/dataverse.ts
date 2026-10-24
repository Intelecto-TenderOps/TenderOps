import { loadEnv } from "../config/env.js";
import { clientCredentialsToken } from "./entra.js";
import { requireConfigured } from "./status.js";

export class DataverseClient {
  constructor(private readonly env = loadEnv()) {}

  async request(path: string, init: RequestInit = {}) {
    const configured = requireConfigured("dataverse");
    if (!configured.ok) return configured;
    const token = await clientCredentialsToken(`${this.env.DATAVERSE_URL}/.default`);
    if (!token.ok) return token;
    const response = await fetch(`${this.env.DATAVERSE_URL}/api/data/v9.2/${path.replace(/^\//, "")}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: "return=representation",
        ...(init.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false as const,
        error: {
          code: "dataverse_error",
          integration: "dataverse",
          message: `Dataverse HTTP ${response.status}`,
          missing: [],
        },
      };
    }
    return { ok: true as const, status: response.status, payload };
  }
}
