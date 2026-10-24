import { requireConfigured } from "./status.js";

export async function enqueue(queue: string, body: unknown, idempotencyKey: string) {
  const configured = requireConfigured("service-bus");
  if (!configured.ok) return configured;
  void queue;
  void body;
  void idempotencyKey;
  return {
    ok: true as const,
    jobId: `job_${idempotencyKey}`,
    status: "queued" as const,
  };
}
