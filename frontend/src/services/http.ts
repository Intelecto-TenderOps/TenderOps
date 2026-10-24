const base = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type IntegrationErrorBody = {
  error?: {
    code?: string;
    integration?: string;
    message?: string;
    missing?: string[];
  };
  configured?: boolean;
  integration?: string;
  message?: string;
};

export type IntegrationFailure = {
  integration: string;
  message: string;
  missing: string[];
  code: string;
  status: number;
};

export function isIntegrationUnconfigured(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const payload = error.payload as IntegrationErrorBody | null;
  const code = payload?.error?.code;
  if (code === "integration_unconfigured" || code === "copilot_unverified") return true;
  if (payload?.configured === false) return true;
  return error.status === 503;
}

export function readIntegrationError(error: unknown): IntegrationFailure {
  if (error instanceof ApiError) {
    const payload = error.payload as IntegrationErrorBody | null;
    return {
      integration: payload?.error?.integration ?? payload?.integration ?? "api",
      message: payload?.error?.message ?? payload?.message ?? error.message,
      missing: payload?.error?.missing ?? [],
      code: payload?.error?.code ?? "api_error",
      status: error.status,
    };
  }
  return {
    integration: "api",
    message: error instanceof Error ? error.message : "Error desconocido",
    missing: [],
    code: "network_error",
    status: 0,
  };
}

async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(`API ${response.status}`, response.status, payload);
  }
  return payload as T;
}

export async function apiGet<T>(path: string, query: Record<string, string | undefined> = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const suffix = params.size ? `?${params}` : "";
  const response = await fetch(`${base}${path}${suffix}`, {
    headers: { Accept: "application/json" },
  });
  return parse<T>(response);
}

export async function apiSend<T>(method: "POST" | "PATCH" | "PUT", path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown) {
  return apiSend<T>("POST", path, body);
}

export async function apiPatch<T>(path: string, body?: unknown) {
  return apiSend<T>("PATCH", path, body);
}
