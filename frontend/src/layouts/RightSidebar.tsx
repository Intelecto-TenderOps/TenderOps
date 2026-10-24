import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { navigation } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { useDemoStore } from "@/store/demo-store";
import { useUiStore } from "@/store/ui-store";

export function RightSidebar() {
  const location = useLocation();
  const expanded = useUiStore((state) => state.navExpanded || state.navPinned);
  const pinned = useUiStore((state) => state.navPinned);
  const setExpanded = useUiStore((state) => state.setNavExpanded);
  const mobileOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobile = useUiStore((state) => state.setMobileNavOpen);
  const companyId = useUiStore((state) => state.companyId);
  const setCompany = useUiStore((state) => state.setCompany);
  const companies = useDemoStore((state) => state.workspace.companies);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <aside
      id="app-navigation"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        if (!pinned) {
          setExpanded(false);
          setOpenMenu(null);
        }
      }}
      className={cn(
        "fixed top-3 bottom-3 right-3 z-40 flex flex-col overflow-visible rounded-[28px] text-[var(--to-sidebar-text)] shadow-[0_20px_60px_rgb(11_35_71/0.28)]",
        "bg-[var(--to-sidebar)] backdrop-blur-2xl",
        expanded ? "w-[268px]" : "w-[84px]",
        mobileOpen ? "max-md:translate-x-0" : "max-md:translate-x-[110%]",
        "max-md:w-[280px]",
      )}
    >
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-electric text-sm font-bold">
          TO
        </span>
        {expanded ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">TenderOps</p>
            <p className="truncate text-[11px] text-cyan">Liquid workspace</p>
          </div>
        ) : null}
      </div>
      <div className="px-3 pt-4">
        <label className="sr-only" htmlFor="active-company">
          Empresa activa
        </label>
        <select
          id="active-company"
          value={companyId}
          onChange={(event) => setCompany(event.target.value)}
          className={cn(
            "w-full rounded-2xl border border-white/10 bg-white/10 px-2 py-2 text-xs text-white",
            !expanded && "sr-only",
          )}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id} className="text-ink">
              {company.tradeName}
            </option>
          ))}
        </select>
      </div>
      <nav aria-label="Navegación principal" className="relative mt-3 min-h-0 flex-1 overflow-y-auto px-2">
        {navigation.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <div key={item.id} className="relative">
              <NavLink
                to={item.to}
                onClick={() => setMobile(false)}
                onMouseEnter={() => item.children && setOpenMenu(item.id)}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-electric text-white shadow-[0_0_24px_rgb(50_103_245/0.45)]"
                    : "text-white/80 hover:bg-white/10",
                  !expanded && "justify-center px-0",
                )}
                title={item.label}
              >
                <item.icon size={18} aria-hidden="true" />
                {expanded ? <span>{item.label}</span> : <span className="sr-only">{item.label}</span>}
              </NavLink>
              {item.children && openMenu === item.id ? (
                <div className="absolute right-full top-0 mr-2 w-56 rounded-2xl bg-[#0B2347]/95 p-2 shadow-xl">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.id}
                      to={child.to}
                      onClick={() => setMobile(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                    >
                      <ChevronLeft size={12} />
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="grid gap-2 px-3 pb-4">
        {expanded ? (
          <div className="rounded-2xl bg-white/8 px-3 py-2 text-xs">
            <p className="font-semibold">Valentina Herrera</p>
            <p className="text-white/70">Administradora · demo</p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
