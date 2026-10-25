import type { IntegrationStatus, SourceConfig } from "@/contracts";

export type LiveDependency = {
  name: string;
  status: "configured" | "unconfigured" | "available" | "error" | "unverified";
  verified: boolean;
  missing: string[];
  message: string;
};

export type SecopStatus = {
  mode: string;
  tokenConfigured: boolean;
  syncEnabled: boolean;
  pollIntervalMs: number;
  lookbackHours: number;
  catalog: {
    size: number;
    lastSuccessAt: string | null;
    lastAttemptAt: string | null;
    lastError: string | null;
  };
};

const SYSTEM: Record<string, IntegrationStatus["system"]> = {
  "secop-public": "SECOP",
  dynamics: "Dynamics 365",
  dataverse: "Dataverse",
  sharepoint: "SharePoint",
  entra: "Entra ID",
  copilot: "Copilot Studio",
  postgresql: "Plataforma",
  "service-bus": "Plataforma",
};

const TITLE: Record<string, string> = {
  "secop-public": "SECOP público",
  postgresql: "Índice PostgreSQL",
  entra: "Microsoft Entra ID",
  dynamics: "Dynamics 365 Sales",
  dataverse: "Dataverse TenderOps",
  sharepoint: "SharePoint / Graph",
  copilot: "Copilot Studio",
  "service-bus": "Azure Service Bus",
};

export function mapDependency(item: LiveDependency): IntegrationStatus {
  const healthy = item.status === "available" || item.status === "configured";
  return {
    id: `int-${item.name}`,
    name: TITLE[item.name] ?? item.name,
    system: SYSTEM[item.name] ?? "Plataforma",
    status: healthy ? (item.verified ? "saludable" : "degradada") : "desconectada",
    lastSync: null,
    note: item.message,
    missing: item.missing,
    configured: healthy,
  };
}

export function findIntegration(
  items: IntegrationStatus[] | undefined,
  system: IntegrationStatus["system"],
) {
  return items?.find((item) => item.system === system);
}

export function microsoftUnconfigured(items: IntegrationStatus[] | undefined) {
  return ["Dynamics 365", "Dataverse", "SharePoint", "Copilot Studio", "Entra ID"].filter((system) => {
    const item = findIntegration(items, system as IntegrationStatus["system"]);
    return !item || item.status === "desconectada" || item.configured === false;
  });
}

export function mapSecopSources(
  sources: { id: string; dataset: string; searchMode: string }[],
  status?: SecopStatus,
): SourceConfig[] {
  return sources.map((source) => ({
    id: source.id,
    name: source.id.replace("_", " "),
    country: "CO",
    enabled: true,
    lastSync: status?.catalog.lastSuccessAt ?? null,
    health: status?.catalog.lastError ? "error" : status?.catalog.size ? "ok" : "atrasada",
  }));
}
