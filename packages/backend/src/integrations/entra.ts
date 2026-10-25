import { loadEnv } from "../config/env.js";
import { requireConfigured } from "./status.js";

export async function clientCredentialsToken(scope: string) {
  const configured = requireConfigured("entra");
  if (!configured.ok) return configured;
  const env = loadEnv();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.ENTRA_CLIENT_ID ?? "",
    client_secret: env.ENTRA_CLIENT_SECRET ?? "",
    scope,
  });
  const response = await fetch(`https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    return {
      ok: false as const,
      error: {
        code: "entra_token_failed",
        integration: "entra",
        message: `Entra ID rechazó la solicitud (${response.status}).`,
        missing: [],
      },
    };
  }
  const payload = (await response.json()) as { access_token: string; expires_in: number };
  return { ok: true as const, token: payload.access_token, expiresIn: payload.expires_in };
}
