export interface EntraPublicConfig {
  tenantId: string;
  clientId: string;
  scope: string;
}

export function entraConfig(): EntraPublicConfig | null {
  const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID?.trim();
  const clientId = import.meta.env.VITE_ENTRA_SPA_CLIENT_ID?.trim();
  const scope = import.meta.env.VITE_ENTRA_API_SCOPE?.trim();
  if (!tenantId || !clientId || !scope) return null;
  return { tenantId, clientId, scope };
}

let memoryToken: string | null = null;

export function setSessionToken(token: string | null): void {
  memoryToken = token;
}

export async function getAccessToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  const config = entraConfig();
  if (!config) return null;
  try {
    const msal = await import("@azure/msal-browser");
    const app = new msal.PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: "sessionStorage" },
    });
    await app.initialize();
    const account = app.getActiveAccount() ?? app.getAllAccounts()[0];
    if (!account) return null;
    const result = await app.acquireTokenSilent({
      account,
      scopes: [config.scope],
    });
    return result.accessToken;
  } catch {
    return null;
  }
}

export async function signInWithEntra(): Promise<boolean> {
  const config = entraConfig();
  if (!config) return false;
  const msal = await import("@azure/msal-browser");
  const app = new msal.PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: "sessionStorage" },
  });
  await app.initialize();
  const result = await app.loginPopup({ scopes: [config.scope] });
  app.setActiveAccount(result.account);
  return true;
}
