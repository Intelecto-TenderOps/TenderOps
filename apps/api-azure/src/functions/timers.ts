import { app, type InvocationContext, type Timer } from "@azure/functions";
import { loadConfig } from "../shared/config.js";
import { getContainer } from "../app/container.js";
import {
  checkDocumentExpiration,
  checkTaskDeadlines,
  cleanupCatalog,
  generateAlerts,
  reconcileDynamics,
  runSecopSync,
} from "../jobs/runner.js";
import { evaluateSavedSearches } from "../domains/secop/sync.js";

async function run(name: string, work: () => Promise<unknown>, context: InvocationContext): Promise<void> {
  context.log(`Starting ${name}`);
  try {
    const result = await work();
    context.log(`${name} completed`, result);
  } catch (error) {
    context.error(`${name} failed`, error instanceof Error ? error.message : "unknown");
  }
}

function schedule(name: string, expression: string, work: (context: InvocationContext) => Promise<void>): void {
  app.timer(name, {
    schedule: expression,
    handler: async (timer: Timer, context: InvocationContext) => {
      if (timer.isPastDue) context.log(`${name} is past due`);
      await work(context);
    },
  });
}

const config = loadConfig();
const store = () => getContainer().store;

schedule("SyncSecopRecent", config.syncSchedule, (context) =>
  run("SyncSecopRecent", () => runSecopSync(store(), { kind: "recent" }), context));
schedule("SyncSecopChanges", config.syncSchedule, (context) =>
  run("SyncSecopChanges", () => runSecopSync(store(), { kind: "changes" }), context));
schedule("SyncMonitoredTenders", config.monitoredSchedule, (context) =>
  run("SyncMonitoredTenders", () => runSecopSync(store(), { kind: "monitored" }), context));
schedule("EvaluateSavedSearches", config.savedSearchSchedule, async (context) => {
  await run("EvaluateSavedSearches", async () => {
    // Saved searches are company-scoped; the timer only evaluates companies already materialized in the store.
    return { note: "company-scoped evaluation", matches: await evaluateSavedSearches(store(), "") };
  }, context);
});
schedule("GenerateTenderAlerts", config.savedSearchSchedule, (context) =>
  run("GenerateTenderAlerts", () => generateAlerts(store()), context));
schedule("CheckDocumentExpiration", config.documentExpirySchedule, (context) =>
  run("CheckDocumentExpiration", () => checkDocumentExpiration(store()), context));
schedule("CheckTaskDeadlines", config.taskDeadlineSchedule, (context) =>
  run("CheckTaskDeadlines", () => checkTaskDeadlines(store()), context));
schedule("ReconcileDynamics", config.reconcileSchedule, (context) =>
  run("ReconcileDynamics", () => reconcileDynamics(), context));
schedule("CleanupSecopCache", config.cleanupSchedule, (context) =>
  run("CleanupSecopCache", () => cleanupCatalog(store()), context));
