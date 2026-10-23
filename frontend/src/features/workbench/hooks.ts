import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute, readWorkspace, WorkbenchError } from "./repository";
import type { Command, WorkbenchContext } from "./types";
export function useWorkbench(context: WorkbenchContext) {
  return useQuery({
    queryKey: ["workbench", context.companyId, context.demo, context.role],
    queryFn: ({ signal }) => readWorkspace(context, signal),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.jobs.some((job) =>
        ["Pendiente", "En curso"].includes(job.status),
      )
        ? 700
        : false,
  });
}
export function useCommand(context: WorkbenchContext) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (command: Command) => execute(context, command),
    retry: false,
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: ["workbench", context.companyId] }),
  });
}
export function describeError(error: unknown): string {
  return error instanceof WorkbenchError
    ? error.message
    : error instanceof Error && error.name === "ZodError"
      ? "Revisa los datos del formulario. Hay un campo vacío o un valor inválido."
      : "No se pudo completar la acción. Conservamos los datos para que puedas volver a intentarlo.";
}
