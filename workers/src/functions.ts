import { syncSource } from "../../packages/backend/src/secop/sync.js";

export async function SyncSecopIIProcesses() {
  return syncSource("SECOP_II");
}

export async function SyncSecopIProcesses() {
  return syncSource("SECOP_I");
}

export async function ReconcileSecopCatalog() {
  return { status: "pending_resources", message: "La reconciliación requiere PostgreSQL e índice poblado." };
}

export async function EvaluateSavedSearches() {
  return { status: "pending_credentials", message: "Las búsquedas guardadas viven en Dataverse." };
}

export async function GenerateTenderAlerts() {
  return { status: "pending_credentials", message: "Las alertas persistidas requieren Dataverse y Service Bus." };
}
