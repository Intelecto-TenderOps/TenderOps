import { Menu, X } from "lucide-react";
import { Outlet } from "react-router-dom";
import { AccessibilityDock } from "@/components/a11y/AccessibilityDock";
import { DrawerManager } from "@/components/flow/DrawerManager";
import { AZURE_MODE_LABEL, DEMO_MODE_LABEL } from "@/config/constants";
import { usesRemoteApi } from "@/lib/api";
import { RightSidebar } from "./RightSidebar";
import { useDrawerStore } from "@/store/drawer-store";
import { useUiStore } from "@/store/ui-store";
import { useEffect } from "react";

export function AppShell() {
  const flowOpen = useDrawerStore((state) => state.open);
  const size = useDrawerStore((state) => state.size);
  const navExpanded = useUiStore((state) => state.navExpanded || state.navPinned);
  const navPinned = useUiStore((state) => state.navPinned);
  const setExpanded = useUiStore((state) => state.setNavExpanded);
  const mobileNav = useUiStore((state) => state.mobileNavOpen);
  const setMobile = useUiStore((state) => state.setMobileNavOpen);

  useEffect(() => {
    if (flowOpen && !navPinned) setExpanded(false);
  }, [flowOpen, navPinned, setExpanded]);

  useEffect(() => {
    const nav = navExpanded ? "268px" : "84px";
    const flow =
      !flowOpen
        ? "0px"
        : size === "wide"
          ? `min(760px, calc(100vw - ${nav} - 24px))`
          : size === "compact"
            ? `min(420px, calc(100vw - ${nav} - 24px))`
            : `min(560px, calc(100vw - ${nav} - 24px))`;
    document.documentElement.style.setProperty("--to-nav-width", nav);
    document.documentElement.style.setProperty("--to-flow-width", flow);
    document.documentElement.dataset.nav = navExpanded ? "expanded" : "compact";
    document.documentElement.dataset.flow = flowOpen ? size : "none";
  }, [flowOpen, size, navExpanded]);

  return (
    <div
      className="app-shell min-h-screen"
      data-nav={navExpanded ? "expanded" : "compact"}
      data-flow={flowOpen ? size : "none"}
    >
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-3 focus:py-2" href="#content">
        Ir al contenido
      </a>
      <div
        className="flex min-h-screen flex-col"
        style={{
          paddingRight: "calc(var(--to-nav-width) + var(--to-flow-width) + 28px)",
          paddingLeft: 20,
          paddingTop: 10,
          paddingBottom: 12,
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="glass-panel flex items-center gap-2 rounded-full px-3 py-1 text-[11px] text-muted">
            <span className="h-2 w-2 rounded-full bg-electric" aria-hidden="true" />
            {usesRemoteApi()
              ? `${AZURE_MODE_LABEL} · datos de la empresa activa`
              : `${DEMO_MODE_LABEL} · datos simulados · se pueden restablecer`}
          </div>
          <button
            type="button"
            className="glass-panel hidden rounded-full p-2 max-md:inline-flex"
            aria-label={mobileNav ? "Cerrar navegación" : "Abrir navegación"}
            aria-expanded={mobileNav}
            aria-controls="app-navigation"
            onClick={() => setMobile(!mobileNav)}
          >
            {mobileNav ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <main id="content" className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
      <DrawerManager />
      <AccessibilityDock />
      <RightSidebar />
    </div>
  );
}
