import type { ReactNode } from "react";

export function ContextDetailPanel({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <aside className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[24px]">
      <div className="flex items-center justify-between gap-2 border-b border-white/60 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {actions}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}
