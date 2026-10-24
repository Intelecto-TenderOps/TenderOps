import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().optional(),
  APP_ENV: z.enum(["development", "preview", "production", "test"]).default("development"),
  APP_BASE_URL: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  API_VERSION: z.string().default("v1"),
  LOG_LEVEL: z.string().default("info"),
  SECOP_SEARCH_MODE: z.enum(["live", "indexed", "hybrid"]).default("live"),
  SECOP_II_DATASET_ID: z.string().default("p6dx-8zbt"),
  SECOP_I_DATASET_ID: z.string().default("f789-7hwg"),
  SECOP_II_MODIFICATIONS_DATASET_ID: z.string().default("e2u2-swiw"),
  SECOP_I_MODIFICATIONS_DATASET_ID: z.string().default("36vw-pbq2"),
  SECOP_II_DOCUMENTS_DATASET_ID: z.string().default("dmgg-8hin"),
  SOCRATA_BASE_URL: z.string().default("https://www.datos.gov.co/resource"),
  SOCRATA_APP_TOKEN: z.string().optional(),
  SECOP_REQUEST_TIMEOUT_MS: z.coerce.number().default(12_000),
  SECOP_PAGE_SIZE: z.coerce.number().default(25),
  SECOP_SYNC_ENABLED: z.enum(["true", "false"]).default("false"),
  SECOP_SYNC_BATCH_SIZE: z.coerce.number().default(200),
  DATABASE_URL: z.string().optional(),
  DATABASE_SSL_MODE: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  AZURE_TENANT_ID: z.string().optional(),
  ENTRA_API_CLIENT_ID: z.string().optional(),
  ENTRA_API_AUDIENCE: z.string().optional(),
  ENTRA_CLIENT_ID: z.string().optional(),
  ENTRA_CLIENT_SECRET: z.string().optional(),
  ENTRA_CERTIFICATE_REFERENCE: z.string().optional(),
  DYNAMICS_BASE_URL: z.string().optional(),
  DYNAMICS_ENVIRONMENT_ID: z.string().optional(),
  DYNAMICS_APPLICATION_USER_ID: z.string().optional(),
  DATAVERSE_URL: z.string().optional(),
  DATAVERSE_ENVIRONMENT_ID: z.string().optional(),
  DATAVERSE_SOLUTION_NAME: z.string().default("TenderOps"),
  SHAREPOINT_SITE_URL: z.string().default("https://intelecto1.sharepoint.com/sites/intelectocrm"),
  SHAREPOINT_LIBRARY_NAME: z.string().default("Cuenta"),
  SHAREPOINT_SITE_ID: z.string().optional(),
  SHAREPOINT_DRIVE_ID: z.string().optional(),
  COPILOT_ENVIRONMENT_ID: z.string().optional(),
  COPILOT_TENANT_ID: z.string().optional(),
  COPILOT_ORCHESTRATOR_AGENT_ID: z.string().optional(),
  COPILOT_VIABILITY_AGENT_ID: z.string().optional(),
  COPILOT_STRATEGY_AGENT_ID: z.string().optional(),
  COPILOT_OBSERVATIONS_AGENT_ID: z.string().optional(),
  COPILOT_DOCUMENT_AGENT_ID: z.string().optional(),
  COPILOT_CANDIDATES_AGENT_ID: z.string().optional(),
  COPILOT_CONNECTION_STRING: z.string().optional(),
  AZURE_FUNCTIONS_BASE_URL: z.string().optional(),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_SERVICE_BUS_CONNECTION_STRING: z.string().optional(),
  AZURE_KEY_VAULT_URL: z.string().optional(),
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
});

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cached && source === process.env) return cached;
  const parsed = schema.parse(source);
  if (source === process.env) cached = parsed;
  return parsed;
}

export function resetEnvCache() {
  cached = null;
}

export function integrationState(configured: boolean, verified = false) {
  if (!configured) return { status: "unconfigured" as const, verified: false };
  return { status: verified ? "available" as const : "configured" as const, verified };
}
