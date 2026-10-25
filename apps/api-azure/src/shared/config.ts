export type EnvironmentName = "development" | "testing" | "preview" | "production";
export type StorageMode = "Memory" | "Dataverse";

function read(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function requiredWhen(condition: boolean, name: string): string {
  const value = read(name);
  if (condition && !value) throw new Error(`Missing configuration: ${name}`);
  return value;
}

function parseCsv(name: string, fallback: string[] = []): string[] {
  const raw = read(name);
  return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : fallback;
}

export function environmentName(): EnvironmentName {
  const value = read("TENDEROPS_ENVIRONMENT", read("AZURE_FUNCTIONS_ENVIRONMENT", "development")).toLowerCase();
  if (value === "production" || value === "prod") return "production";
  if (value === "preview" || value === "test" || value === "testing") return value === "preview" ? "preview" : "testing";
  return "development";
}

export function isLocalEnvironment(): boolean {
  const env = environmentName();
  return env === "development" || env === "testing";
}

export interface AppConfig {
  environment: EnvironmentName;
  demoEnabled: boolean;
  storageMode: StorageMode;
  demoTokenSecret: string;
  tenantId: string;
  spaClientId: string;
  apiClientId: string;
  apiAudience: string;
  apiScope: string;
  serviceClientId: string;
  dataverseUrl: string;
  dataverseEnvironmentId: string;
  dataverseSolution: string;
  dataversePrefix: string;
  dataverseMetadataVerified: boolean;
  dynamicsUrl: string;
  dynamicsEnvironmentId: string;
  sharePointSiteUrl: string;
  sharePointSiteId: string;
  sharePointDriveId: string;
  sharePointLibrary: string;
  copilotEnvironmentId: string;
  copilotAgents: Record<string, string>;
  secopIiDataset: string;
  secopIDataset: string;
  socrataAppToken: string;
  retentionDays: number;
  syncSchedule: string;
  monitoredSchedule: string;
  savedSearchSchedule: string;
  reconcileSchedule: string;
  documentExpirySchedule: string;
  taskDeadlineSchedule: string;
  cleanupSchedule: string;
  syncBatchSize: number;
  maxRequestsPerRun: number;
  catalogMaxPerRun: number;
  corsOrigins: string[];
  storageAccountName: string;
  keyVaultUrl: string;
  insightsConnection: string;
  functionsBaseUrl: string;
}

let cached: AppConfig | undefined;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const environment = environmentName();
  const local = environment === "development" || environment === "testing";
  const demoEnabled = read("DEMO_ENABLED", local ? "true" : "false") === "true";
  if (demoEnabled && !local) throw new Error("DEMO_ENABLED is restricted to development and testing");
  const storageMode = (read("STORAGE_MODE", local ? "Memory" : "Dataverse") as StorageMode);
  if (storageMode !== "Memory" && storageMode !== "Dataverse") throw new Error("Unsupported STORAGE_MODE");
  if (storageMode === "Memory" && !local) throw new Error("Memory storage is restricted to development and testing");
  const prefix = read("DATAVERSE_PUBLISHER_PREFIX", "tno");
  if (!/^[a-z][a-z0-9]{1,7}$/.test(prefix)) throw new Error("Invalid DATAVERSE_PUBLISHER_PREFIX");
  cached = {
    environment,
    demoEnabled,
    storageMode,
    demoTokenSecret: read("DEMO_TOKEN_SECRET", local ? "local-dev-only-change-me" : ""),
    tenantId: requiredWhen(!demoEnabled && !local, "AZURE_TENANT_ID"),
    spaClientId: read("ENTRA_SPA_CLIENT_ID"),
    apiClientId: read("ENTRA_API_CLIENT_ID"),
    apiAudience: read("ENTRA_API_AUDIENCE", read("ENTRA_API_CLIENT_ID")),
    apiScope: read("ENTRA_API_SCOPE", "api://tenderops/access"),
    serviceClientId: read("ENTRA_SERVICE_CLIENT_ID"),
    dataverseUrl: read("DATAVERSE_URL"),
    dataverseEnvironmentId: read("DATAVERSE_ENVIRONMENT_ID"),
    dataverseSolution: read("DATAVERSE_SOLUTION_NAME", "TenderOpsFoundation"),
    dataversePrefix: prefix,
    dataverseMetadataVerified: read("DATAVERSE_METADATA_VERIFIED") === "true",
    dynamicsUrl: read("DYNAMICS_BASE_URL"),
    dynamicsEnvironmentId: read("DYNAMICS_ENVIRONMENT_ID"),
    sharePointSiteUrl: read("SHAREPOINT_SITE_URL", "https://intelecto1.sharepoint.com/sites/intelectocrm"),
    sharePointSiteId: read("SHAREPOINT_SITE_ID"),
    sharePointDriveId: read("SHAREPOINT_DRIVE_ID"),
    sharePointLibrary: read("SHAREPOINT_LIBRARY_NAME", "Cuenta"),
    copilotEnvironmentId: read("COPILOT_ENVIRONMENT_ID"),
    copilotAgents: {
      orquestador: read("COPILOT_ORCHESTRATOR_AGENT_ID"),
      viabilidad: read("COPILOT_VIABILITY_AGENT_ID"),
      estrategia: read("COPILOT_STRATEGY_AGENT_ID"),
      observaciones: read("COPILOT_OBSERVATIONS_AGENT_ID"),
      documentos: read("COPILOT_DOCUMENT_AGENT_ID"),
      candidatos: read("COPILOT_CANDIDATES_AGENT_ID"),
    },
    secopIiDataset: read("SECOP_II_DATASET_ID", "p6dx-8zbt"),
    secopIDataset: read("SECOP_I_DATASET_ID", "f789-7hwg"),
    socrataAppToken: read("SOCRATA_APP_TOKEN"),
    retentionDays: Number(read("SECOP_RETENTION_DAYS", "90")) || 90,
    syncSchedule: read("SECOP_SYNC_SCHEDULE", "0 0 * * * *"),
    monitoredSchedule: read("SECOP_MONITORED_SCHEDULE", "0 0 * * * *"),
    savedSearchSchedule: read("SECOP_SEARCH_SCHEDULE", "0 0 * * * *"),
    reconcileSchedule: read("DYNAMICS_RECONCILE_SCHEDULE", "0 0 */4 * * *"),
    documentExpirySchedule: read("DOCUMENT_EXPIRY_SCHEDULE", "0 0 6 * * *"),
    taskDeadlineSchedule: read("TASK_DEADLINE_SCHEDULE", "0 15 6 * * *"),
    cleanupSchedule: read("CLEANUP_SCHEDULE", "0 30 6 * * *"),
    syncBatchSize: Number(read("SECOP_SYNC_BATCH_SIZE", "100")) || 100,
    maxRequestsPerRun: Number(read("SECOP_MAX_REQUESTS_PER_RUN", "20")) || 20,
    catalogMaxPerRun: Number(read("SECOP_CATALOG_MAX_PER_RUN", "500")) || 500,
    corsOrigins: parseCsv("CORS_ALLOWED_ORIGINS", [
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      "http://127.0.0.1:4173",
    ]),
    storageAccountName: read("AZURE_STORAGE_ACCOUNT_NAME"),
    keyVaultUrl: read("AZURE_KEY_VAULT_URL"),
    insightsConnection: read("APPLICATIONINSIGHTS_CONNECTION_STRING"),
    functionsBaseUrl: read("AZURE_FUNCTIONS_BASE_URL"),
  };
  return cached;
}

export function resetConfig(): void {
  cached = undefined;
}

export function integrationReady(kind: "dataverse" | "dynamics" | "graph" | "copilot" | "entra"): boolean {
  const config = loadConfig();
  switch (kind) {
    case "dataverse":
      return Boolean(config.dataverseUrl && config.dataverseMetadataVerified && config.storageMode === "Dataverse");
    case "dynamics":
      return Boolean(config.dynamicsUrl && config.tenantId);
    case "graph":
      return Boolean(config.sharePointSiteUrl && (config.sharePointSiteId || config.sharePointDriveId) && config.tenantId);
    case "copilot":
      return Boolean(config.copilotEnvironmentId && config.copilotAgents.orquestador);
    case "entra":
      return Boolean(config.tenantId && config.apiAudience);
  }
}
