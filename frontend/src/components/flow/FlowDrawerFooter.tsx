import type { ReactNode } from "react";

export function FlowDrawerFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-white/60 bg-white/75 px-5 py-3 backdrop-blur-xl">
      {children}
    </footer>
  );
}
