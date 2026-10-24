import { integrationState, loadEnv } from "../config/env.js";

export type DependencyStatus = {
  name: string;
  status: "configured" | "unconfigured" | "available" | "error" | "unverified";
  verified: boolean;
  missing: string[];
  message: string;
};

export function microsoftAuthReady() {
  const env = loadEnv();
  const missing = ["AZURE_TENANT_ID", "ENTRA_CLIENT_ID"].filter((key) => !env[key as keyof typeof env]);
  if (!env.ENTRA_CLIENT_SECRET && !env.ENTRA_CERTIFICATE_REFERENCE) missing.push("ENTRA_CLIENT_SECRET|ENTRA_CERTIFICATE_REFERENCE");
  return { ready: missing.length === 0, missing };
}

export function dependencyReport(): DependencyStatus[] {
  const env = loadEnv();
  const entra = microsoftAuthReady();
  return [
    {
      name: "secop-public",
      status: "available",
      verified: true,
      missing: [],
      message: env.SOCRATA_APP_TOKEN
        ? "Socrata público con token de aplicación."
        : "Socrata público sin token; sujeto a cupos del proveedor.",
    },
    dep("postgresql", ["DATABASE_URL"], env.DATABASE_URL ? "Índice SECOP listo para migraciones." : "Sin DATABASE_URL; solo modo live."),
    dep("entra", entra.missing, entra.ready ? "Entra ID parametrizado." : "Falta autenticación de aplicación."),
    dep("dynamics", ["DYNAMICS_BASE_URL", ...entra.missing], "Dynamics 365 Sales Web API."),
    dep("dataverse", ["DATAVERSE_URL", ...entra.missing], "Dataverse Web API."),
    dep("sharepoint", ["SHAREPOINT_SITE_URL", ...entra.missing], "Microsoft Graph / SharePoint."),
    dep("copilot", ["COPILOT_ORCHESTRATOR_AGENT_ID", "COPILOT_CONNECTION_STRING"], "Copilot Studio gateway."),
    dep("service-bus", ["AZURE_SERVICE_BUS_CONNECTION_STRING"], "Colas asíncronas."),
  ];
}

function dep(name: string, missing: string[], message: string): DependencyStatus {
  const absent = missing.filter(Boolean);
  const configured = absent.length === 0;
  return {
    name,
    ...integrationState(configured),
    status: configured ? "configured" : "unconfigured",
    missing: absent,
    message,
  };
}

export function requireConfigured(name: string) {
  const item = dependencyReport().find((entry) => entry.name === name);
  if (!item || item.status === "unconfigured") {
    return {
      ok: false as const,
      error: {
        code: "integration_unconfigured",
        integration: name,
        message: item?.message ?? "Integración no configurada",
        missing: item?.missing ?? [],
      },
    };
  }
  return { ok: true as const, item };
}
