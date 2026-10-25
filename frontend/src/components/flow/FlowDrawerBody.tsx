import type { ReactNode } from "react";

export function FlowDrawerBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>;
}
