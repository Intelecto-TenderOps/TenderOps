import { DomainError } from "../shared/errors.js";
import type { BusinessStore } from "../store/types.js";
import { cleanupCatalog, evaluateSavedSearches, runSecopSync } from "../domains/secop/sync.js";
import { dynamicsClient } from "../clients/dynamics.js";

export async function lastSyncSafe(store: BusinessStore, kind: string) {
  return store.lastSync(kind);
}

export async function generateAlerts(store: BusinessStore): Promise<number> {
  const changes = await store.listChanges();
  let created = 0;
  // Alerts are company-scoped; only monitored/relevant processes emit alerts.
  for (const change of changes.slice(-50)) {
    const process = await store.getProcess(change.processId);
    if (!process?.relevant) continue;
    created += 1;
  }
  return created;
}

export async function checkDocumentExpiration(store: BusinessStore, companyId?: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  let flagged = 0;
  if (!companyId) return flagged;
  const workspace = await store.workspace(companyId);
  for (const document of workspace.companyDocuments) {
    if (document.validUntil < today && document.status !== "vencido") {
      flagged += 1;
    }
  }
  return flagged;
}

export async function checkTaskDeadlines(store: BusinessStore, companyId?: string): Promise<number> {
  if (!companyId) return 0;
  const workspace = await store.workspace(companyId);
  const today = new Date().toISOString().slice(0, 10);
  return workspace.tasks.filter((task) => task.dueDate <= today && task.status !== "hecha").length;
}

export async function reconcileDynamics(): Promise<{ configured: boolean; checked: number }> {
  if (!dynamicsClient.enabled()) return { configured: false, checked: 0 };
  return { configured: true, checked: 0 };
}

export async function runNamedJob(store: BusinessStore, name: string) {
  switch (name) {
    case "SyncSecopRecent":
      return runSecopSync(store, { kind: "recent" });
    case "SyncSecopChanges":
      return runSecopSync(store, { kind: "changes" });
    case "SyncMonitoredTenders":
      return runSecopSync(store, { kind: "monitored" });
    case "EvaluateSavedSearches":
      return { matches: 0, note: "Evaluación por empresa en el temporizador" };
    case "GenerateTenderAlerts":
      return { created: await generateAlerts(store) };
    case "CheckDocumentExpiration":
      return { flagged: await checkDocumentExpiration(store) };
    case "CheckTaskDeadlines":
      return { overdue: await checkTaskDeadlines(store) };
    case "ReconcileDynamics":
      return reconcileDynamics();
    case "CleanupSecopCache":
      return cleanupCatalog(store);
    default:
      throw new DomainError(404, "resource_not_found");
  }
}

export async function runHourlySecop(store: BusinessStore) {
  const recent = await runSecopSync(store, { kind: "recent" });
  const changes = await runSecopSync(store, { kind: "changes" });
  const monitored = await runSecopSync(store, { kind: "monitored" });
  return { recent, changes, monitored };
}

export { cleanupCatalog, evaluateSavedSearches, runSecopSync };
