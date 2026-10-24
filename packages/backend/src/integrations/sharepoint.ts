import { loadEnv } from "../config/env.js";
import { clientCredentialsToken } from "./entra.js";
import { requireConfigured } from "./status.js";

export class SharePointGraphClient {
  constructor(private readonly env = loadEnv()) {}

  async graph(path: string, init: RequestInit = {}) {
    const configured = requireConfigured("sharepoint");
    if (!configured.ok) return configured;
    const token = await clientCredentialsToken("https://graph.microsoft.com/.default");
    if (!token.ok) return token;
    const response = await fetch(`https://graph.microsoft.com/v1.0/${path.replace(/^\//, "")}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token.token}`,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false as const,
        error: {
          code: "graph_error",
          integration: "sharepoint",
          message: `Graph HTTP ${response.status}`,
          missing: [],
        },
      };
    }
    return { ok: true as const, payload };
  }

  resolveSite() {
    const hostname = new URL(this.env.SHAREPOINT_SITE_URL).hostname;
    const sitePath = new URL(this.env.SHAREPOINT_SITE_URL).pathname;
    return this.graph(`sites/${hostname}:${sitePath}`);
  }
}
