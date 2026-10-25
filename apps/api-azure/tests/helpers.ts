import { HttpRequest } from "@azure/functions";
import { resetConfig } from "../src/shared/config.js";
import { resetContainer, seedDemo, demoToken } from "../src/app/container.js";
import { routeRequest } from "../src/functions/http.js";

export function setupTestEnv(): void {
  process.env.TENDEROPS_ENVIRONMENT = "testing";
  process.env.DEMO_ENABLED = "true";
  process.env.STORAGE_MODE = "Memory";
  process.env.DEMO_TOKEN_SECRET = "test-secret";
  process.env.SECOP_II_DATASET_ID = "p6dx-8zbt";
  process.env.SECOP_I_DATASET_ID = "f789-7hwg";
  process.env.SECOP_RETENTION_DAYS = "90";
  resetConfig();
  resetContainer();
}

export async function request(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-correlation-id": "test-correlation",
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers ?? {}),
  };
  const url = `https://localhost${path}`;
  const init: ConstructorParameters<typeof HttpRequest>[0] = {
    method,
    url,
    headers,
    body: options.body === undefined ? undefined : { string: JSON.stringify(options.body) },
  };
  const httpRequest = new HttpRequest(init);
  const response = await routeRequest(httpRequest, {
    invocationId: "test",
    functionName: "api",
    extraInputs: { get: () => undefined },
    extraOutputs: { set: () => undefined },
    retryContext: undefined,
    traceContext: undefined,
    triggerMetadata: {},
    options: {},
    log: () => undefined,
    trace: () => undefined,
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  } as never);
  return {
    status: response.status ?? 200,
    body: response.jsonBody,
    headers: response.headers ?? {},
  };
}

export async function login(alias = "admin") {
  await seedDemo();
  return demoToken(alias);
}
