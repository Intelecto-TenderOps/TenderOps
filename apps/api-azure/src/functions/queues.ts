import { app, type InvocationContext } from "@azure/functions";
import { getContainer } from "../app/container.js";
import { runNamedJob } from "../jobs/runner.js";

async function handle(queueName: string, message: unknown, context: InvocationContext): Promise<void> {
  const payload = typeof message === "string" ? JSON.parse(message) : message;
  const name = String((payload as { job?: string }).job ?? queueName);
  context.log(`Queue ${queueName} received ${name}`);
  await runNamedJob(getContainer().store, name);
}

app.storageQueue("secopSyncQueue", {
  queueName: "secop-sync",
  connection: "AzureWebJobsStorage",
  handler: (message, context) => handle("secop-sync", message, context),
});

app.storageQueue("tenderAlertsQueue", {
  queueName: "tender-alerts",
  connection: "AzureWebJobsStorage",
  handler: (message, context) => handle("tender-alerts", message, context),
});
