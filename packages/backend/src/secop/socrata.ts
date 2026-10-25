import { loadDotEnvFiles } from "../config/load-dotenv.js";
import { loadEnv } from "../config/env.js";

loadDotEnvFiles();
import { buildQuery, type SoqlQuery } from "./soql.js";

export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 502,
    readonly retryable = false,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class CircuitOpenError extends IntegrationError {
  constructor(dataset: string) {
    super(`Circuito abierto para ${dataset}`, "circuit_open", 503, true);
  }
}

type Circuit = { failures: number; openedAt: number | null };

const circuits = new Map<string, Circuit>();

export class SocrataClient {
  constructor(
    private readonly env = loadEnv(),
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async query<T>(dataset: string, source: "SECOP_II" | "SECOP_I", query: SoqlQuery): Promise<{
    rows: T[];
    requestId: string;
    durationMs: number;
    lastModified: string | null;
  }> {
    this.assertCircuit(dataset);
    const params = buildQuery(source, query);
    const url = `${this.env.SOCRATA_BASE_URL.replace(/\/$/, "")}/${dataset}.json?${params.toString()}`;
    const started = Date.now();
    const { response, body, requestId } = await this.request(url);
    this.recordSuccess(dataset);
    if (!Array.isArray(body)) {
      throw new IntegrationError("La respuesta de Socrata no es una lista", "invalid_response", 502, true);
    }
    return {
      rows: body as T[],
      requestId,
      durationMs: Date.now() - started,
      lastModified: response.headers.get("x-soda2-truth-last-modified") ?? response.headers.get("last-modified"),
    };
  }

  async getJson(dataset: string, params: URLSearchParams) {
    this.assertCircuit(dataset);
    const url = `${this.env.SOCRATA_BASE_URL.replace(/\/$/, "")}/${dataset}.json?${params.toString()}`;
    const { response, body, requestId } = await this.request(url);
    this.recordSuccess(dataset);
    return { body, requestId, lastModified: response.headers.get("last-modified") };
  }

  async count(dataset: string, source: "SECOP_II" | "SECOP_I", query: Omit<SoqlQuery, "select" | "limit" | "offset" | "order">) {
    const params = buildQuery(source, { ...query, select: undefined, limit: 1, offset: 0 });
    params.set("$select", "count(*) as total");
    params.delete("$order");
    const url = `${this.env.SOCRATA_BASE_URL.replace(/\/$/, "")}/${dataset}.json?${params.toString()}`;
    const { body } = await this.request(url);
    const total = Number((body as { total?: string }[])[0]?.total ?? 0);
    return Number.isFinite(total) ? total : 0;
  }

  private async request(url: string) {
    const maxAttempts = 4;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.env.SECOP_REQUEST_TIMEOUT_MS);
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (this.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = this.env.SOCRATA_APP_TOKEN;
        const response = await this.fetchImpl(url, { headers, signal: controller.signal });
        const requestId = response.headers.get("x-socrata-requestid") ?? crypto.randomUUID();
        if (response.status === 429 || response.status >= 500) {
          const retryAfter = Number(response.headers.get("retry-after") ?? 0);
          if (attempt === maxAttempts) {
            this.recordFailure(new URL(url).pathname);
            throw new IntegrationError(`Socrata HTTP ${response.status}`, "upstream_error", response.status, true, { requestId });
          }
          await sleep(retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt);
          continue;
        }
        if (!response.ok) {
          throw new IntegrationError(`Socrata HTTP ${response.status}`, "upstream_rejected", response.status, false, { requestId });
        }
        const body = await response.json();
        return { response, body, requestId };
      } catch (error) {
        lastError = error;
        if (error instanceof IntegrationError && !error.retryable) throw error;
        if (attempt === maxAttempts) {
          this.recordFailure(new URL(url).pathname);
          if (error instanceof Error && error.name === "AbortError") {
            throw new IntegrationError("Tiempo de espera agotado en Socrata", "timeout", 504, true);
          }
          throw error;
        }
        await sleep(250 * 2 ** attempt);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new IntegrationError("Fallo Socrata", "upstream_error", 502, true);
  }

  private assertCircuit(dataset: string) {
    const circuit = circuits.get(dataset);
    if (circuit?.openedAt && Date.now() - circuit.openedAt < 30_000) {
      throw new CircuitOpenError(dataset);
    }
  }

  private recordSuccess(dataset: string) {
    circuits.set(dataset, { failures: 0, openedAt: null });
  }

  private recordFailure(dataset: string) {
    const current = circuits.get(dataset) ?? { failures: 0, openedAt: null };
    const failures = current.failures + 1;
    circuits.set(dataset, { failures, openedAt: failures >= 5 ? Date.now() : null });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
