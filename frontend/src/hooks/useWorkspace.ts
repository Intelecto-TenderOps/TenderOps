import { useDemoStore } from "@/store/demo-store";

export function useWorkspace() {
  return useDemoStore((state) => state.workspace);
}
