import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import { loadConfig } from "./config.js";
import { DomainError, problem } from "./errors.js";

export function correlationId(request?: HttpRequest): string {
  return request?.headers.get("x-correlation-id") ?? crypto.randomUUID().replaceAll("-", "");
}

export function json(status: number, body: unknown, correlation: string, extra: Record<string, string> = {}): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-correlation-id": correlation,
      "referrer-policy": "same-origin",
      ...extra,
    },
  };
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = loadConfig().corsOrigins;
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-csrf-token,idempotency-key,if-match,x-company-id,x-correlation-id",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    vary: "Origin",
  };
}

export async function readJson<T>(request: HttpRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new DomainError(400, "invalid_body");
  }
}

export function query(request: HttpRequest, name: string, fallback = ""): string {
  return request.query.get(name) ?? fallback;
}

export function queryInt(request: HttpRequest, name: string, fallback: number): number {
  const raw = request.query.get(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new DomainError(400, "invalid_pagination");
  return value;
}

export function safeError(error: unknown, correlation: string): HttpResponseInit {
  if (error instanceof DomainError) {
    const headers: Record<string, string> = {};
    if (error.retryAfter !== undefined) headers["retry-after"] = String(error.retryAfter);
    return json(error.status, problem(error.status, error.code, correlation), correlation, headers);
  }
  return json(500, problem(500, "unexpected_error", correlation), correlation);
}
