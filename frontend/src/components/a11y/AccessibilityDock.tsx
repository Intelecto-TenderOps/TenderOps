import { Accessibility, Moon, PanelRight, RotateCcw, Sun } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useDemoStore } from "@/store/demo-store";
import { useUiStore } from "@/store/ui-store";

export function AccessibilityDock() {
  const [open, setOpen] = useState(true);
  const pinned = useUiStore((state) => state.navPinned);
  const togglePinned = useUiStore((state) => state.toggleNavPinned);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const reset = useDemoStore((state) => state.reset);

  return (
    <aside className="fixed bottom-4 left-4 z-50">
      <div className="glass-panel rounded-[28px] p-1.5 shadow-[0_16px_40px_rgb(11_35_71/0.16)]">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-corporate hover:bg-mist"
          aria-expanded={open}
          aria-controls="a11y-dock-panel"
          onClick={() => setOpen((value) => !value)}
        >
          <Accessibility size={18} />
          <span className="sr-only">{open ? "Cerrar accesibilidad" : "Abrir accesibilidad"}</span>
        </button>
        {open ? (
          <div id="a11y-dock-panel" className="grid w-[196px] gap-1 px-1 pb-1 pt-1">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Accesibilidad</p>
            <DockButton
              icon={<PanelRight size={14} />}
              label={pinned ? "Menú fijado" : "Expandido"}
              onClick={togglePinned}
            />
            <DockButton
              icon={theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
              label={theme === "light" ? "Tema oscuro" : "Tema claro"}
              onClick={toggleTheme}
            />
            <DockButton icon={<RotateCcw size={14} />} label="Restablecer demo" onClick={() => reset()} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function DockButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left text-xs text-ink",
        "hover:bg-mist",
      )}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-mist text-corporate">{icon}</span>
      {label}
    </button>
  );
}
