import { Button } from "@/components/ui/button";
import { useDrawerStore } from "@/store/drawer-store";

export function UnsavedChangesGuard() {
  const confirmClose = useDrawerStore((state) => state.confirmClose);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const setConfirmClose = useDrawerStore((state) => state.setConfirmClose);
  if (!confirmClose) return null;
  return (
    <div className="mx-5 mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-ink">
      <p>Hay cambios sin guardar. ¿Descartar el flujo?</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => setConfirmClose(false)}>
          Seguir editando
        </Button>
        <Button size="sm" variant="danger" onClick={() => closeFlow(true)}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
