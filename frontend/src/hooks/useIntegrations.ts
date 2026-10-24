import { useQuery } from "@tanstack/react-query";
import { integrationsService } from "@/services/integrationsService";

export function useIntegrations() {
  return useQuery({
    queryKey: ["admin-integrations"],
    queryFn: () => integrationsService.list(),
    staleTime: 30_000,
    retry: false,
  });
}

export function useSecopStatus() {
  return useQuery({
    queryKey: ["secop-status"],
    queryFn: () => integrationsService.secopStatus(),
    staleTime: 30_000,
    retry: false,
  });
}

export function useCopilotAgents() {
  return useQuery({
    queryKey: ["copilot-agents"],
    queryFn: () => integrationsService.agents(),
    staleTime: 30_000,
    retry: false,
  });
}
