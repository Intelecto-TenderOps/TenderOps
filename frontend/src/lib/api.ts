import { useUiStore } from "@/store/ui-store";
import { getAccessToken } from "./auth";

export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : "";
}

export function usesRemoteApi(): boolean {
  if (import.meta.env.VITE_FORCE_DEMO === "true") return false;
  return Boolean(apiBaseUrl()) || import.meta.env.VITE_USE_AZURE_API === "true";
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withPrefix = normalized.startsWith("/api/") ? normalized : `/api/v1${normalized}`;
  const base = apiBaseUrl();
  return base ? `${base}${withPrefix}` : withPrefix;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public correlationId?: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = await getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const companyId = useUiStore.getState().companyId;
  if (companyId) headers.set("X-Company-Id", companyId);
  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    code?: string;
    title?: string;
    correlationId?: string;
  } & T;
  if (!response.ok) {
    throw new ApiError(
      payload.code ?? "request_failed",
      payload.title ?? "No se pudo completar la acción.",
      response.status,
      payload.correlationId,
    );
  }
  return payload as T;
}
