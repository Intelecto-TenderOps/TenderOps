import { useQuery } from "@tanstack/react-query";
import { tendersService } from "@/services/tendersService";
import { useWorkspace } from "./useWorkspace";

export function useLiveTender(id: string | undefined) {
  const workspace = useWorkspace();
  const live = useQuery({
    queryKey: ["secop-process", id],
    queryFn: () => tendersService.get(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
  const demo = workspace.tenders.find((item) => item.secopId === id || item.id === id);
  const tender = live.data ?? demo ?? null;
  return { tender, live, demo };
}
