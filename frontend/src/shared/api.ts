import axios from "axios";
import { QueryClient } from "@tanstack/react-query";

export const http = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 30000,
});
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) =>
        axios.isAxiosError(error) &&
        (error.response?.status ?? 0) >= 500 &&
        count < 2,
      staleTime: 30000,
    },
    mutations: { retry: false },
  },
});
export function failure(error: unknown): string {
  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    !axios.isAxiosError(error)
  )
    return error.message;
  if (axios.isAxiosError<{ code?: string; correlationId?: string }>(error)) {
    const code = error.response?.data?.code;
    const messages: Record<string, string> = {
      version_conflict:
        "Otra persona modificó este registro. Recarga los datos antes de guardar.",
      separate_approver_required:
        "La aprobación debe realizarla una persona distinta a quien creó el corte.",
      permission_denied: "Tu rol no permite esta acción.",
      company_access_denied: "No tienes acceso a esta empresa.",
      immutable_approved_version:
        "El corte aprobado no se puede modificar. Crea un nuevo corte.",
      immutable_published_version:
        "La regla publicada no se puede modificar. Crea una nueva versión.",
      invalid_company_reference:
        "Selecciona una referencia que pertenezca a esta empresa.",
      csrf_invalid:
        "La sesión cambió. Recarga la página para volver a intentarlo.",
      secure_file_pipeline_pending:
        "El circuito seguro de archivos aún no está habilitado.",
    };
    return (
      (code && messages[code]) ??
      `No se pudo completar la acción. ${error.response?.data?.correlationId ? "Referencia: " + error.response.data.correlationId : "Revisa la conexión e inténtalo de nuevo."}`
    );
  }
  return "No se pudo completar la acción. Inténtalo de nuevo.";
}
export function commandHeaders(
  csrf: string,
  etag?: string,
): Record<string, string> {
  return {
    "X-CSRF-TOKEN": csrf,
    "Idempotency-Key": crypto.randomUUID(),
    ...(etag ? { "If-Match": etag } : {}),
  };
}
