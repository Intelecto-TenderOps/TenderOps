import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { FlowDrawerHeader } from "./FlowDrawerHeader";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";
import { useDrawerStore } from "@/store/drawer-store";

export function FlowDrawer({ children }: { children: ReactNode }) {
  const open = useDrawerStore((state) => state.open);
  const title = useDrawerStore((state) => state.title);
  const description = useDrawerStore((state) => state.description);
  const recordId = useDrawerStore((state) => state.recordId);
  const steps = useDrawerStore((state) => state.steps);
  const step = useDrawerStore((state) => state.step);
  const closeFlow = useDrawerStore((state) => state.closeFlow);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeFlow();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeFlow]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && closeFlow()}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Content
              aria-describedby={undefined}
              className="pointer-events-none fixed inset-y-3 right-[calc(var(--to-nav-width)+18px)] z-30 outline-none max-md:inset-3 max-md:right-3"
              onEscapeKeyDown={(event) => {
                event.preventDefault();
                closeFlow();
              }}
              onInteractOutside={(event) => event.preventDefault()}
            >
              <motion.aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="flow-title"
                initial={{ x: 48, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 36, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.12, duration: 0.35 }}
                className="pointer-events-auto glass-panel flex h-full w-[var(--to-flow-width)] flex-col overflow-hidden rounded-[28px] max-md:w-full"
              >
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                <FlowDrawerHeader
                  title={title}
                  description={description}
                  recordId={recordId}
                  steps={steps}
                  step={step}
                  onClose={() => closeFlow()}
                />
                <UnsavedChangesGuard />
                {children}
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
