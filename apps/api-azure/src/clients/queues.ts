import { DefaultAzureCredential } from "@azure/identity";
import { QueueServiceClient } from "@azure/storage-queue";
import { loadConfig } from "../shared/config.js";

const QUEUE_NAMES = ["secop-sync", "tender-alerts", "notifications", "dynamics-reconcile"] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

export function queueNames(): readonly string[] {
  return QUEUE_NAMES;
}

export async function enqueue(name: QueueName, message: Record<string, unknown>): Promise<void> {
  const config = loadConfig();
  if (!config.storageAccountName) return;
  const credential = new DefaultAzureCredential();
  const service = new QueueServiceClient(`https://${config.storageAccountName}.queue.core.windows.net`, credential);
  const queue = service.getQueueClient(name);
  await queue.createIfNotExists();
  await queue.sendMessage(Buffer.from(JSON.stringify(message), "utf8").toString("base64"));
}
