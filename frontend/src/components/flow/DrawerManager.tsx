import { FlowDrawer } from "./FlowDrawer";
import { FlowHost } from "@/features/flows/FlowHost";
import { useDrawerStore } from "@/store/drawer-store";

export function DrawerManager() {
  const open = useDrawerStore((state) => state.open);
  if (!open) return null;
  return (
    <FlowDrawer>
      <FlowHost />
    </FlowDrawer>
  );
}
