import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { adminService } from "@/services/adminService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

const tabs = [
  { to: "/administracion", label: "Resumen" },
  { to: "/administracion/usuarios", label: "Usuarios" },
  { to: "/administracion/empresas", label: "Empresas" },
  { to: "/administracion/fuentes", label: "Fuentes" },
  { to: "/administracion/parametros", label: "Parámetros" },
  { to: "/administracion/auditoria", label: "Auditoría" },
  { to: "/administracion/integraciones", label: "Integraciones" },
];

export function AdministracionPage() {
  const location = useLocation();
  const workspace = useDemoStore((state) => state.workspace);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const section = tabs.find((tab) => tab.to === location.pathname)?.label ?? "Resumen";
  return (
    <section className="grid gap-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Administración</p>
        <h1 className="text-3xl font-semibold">{section}</h1>
      </header>
      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/administracion"}
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 text-sm ${isActive ? "bg-electric text-white" : "glass-panel"}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {location.pathname === "/administracion" && (
        <p className="text-sm text-muted">
          Gobierno de usuarios, fuentes, parámetros e integraciones. Ninguna conexión real está activa.
        </p>
      )}
      {location.pathname.endsWith("usuarios") && (
        <ul className="grid gap-2">
          {workspace.memberships.map((item) => (
            <li key={item.id} className="glass-panel flex items-center justify-between rounded-[22px] px-4 py-3">
              <span>{item.name} · {item.role}</span>
              <Button size="sm" onClick={() => openFlow({ type: "edit-user", title: "Administrar usuario", recordId: item.id })}>
                Editar
              </Button>
            </li>
          ))}
        </ul>
      )}
      {location.pathname.endsWith("empresas") && (
        <ul className="grid gap-2">
          {workspace.companies.map((item) => (
            <li key={item.id} className="glass-panel rounded-[22px] px-4 py-3">
              {item.legalName} · {item.taxId}
            </li>
          ))}
        </ul>
      )}
      {location.pathname.endsWith("fuentes") && (
        <ul className="grid gap-2">
          {workspace.sources.map((item) => (
            <li key={item.id} className="glass-panel flex items-center justify-between rounded-[22px] px-4 py-3">
              <span>{item.name} · {item.health}</span>
              <Button size="sm" onClick={() => void adminService.toggleSource(item.id)}>
                {item.enabled ? "Desactivar" : "Activar"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {location.pathname.endsWith("parametros") && (
        <article className="glass-panel rounded-[24px] p-4 text-sm">
          <p>Zona horaria: America/Bogota</p>
          <p>Moneda: COP</p>
          <p>Retención documental propuesta: 5 años</p>
          <Button className="mt-3" onClick={() => openFlow({ type: "edit-params", title: "Parámetros de entorno" })}>
            Modificar
          </Button>
        </article>
      )}
      {location.pathname.endsWith("auditoria") && (
        <ul className="grid gap-2">
          {workspace.auditEvents.map((item) => (
            <li key={item.id} className="glass-panel rounded-[22px] px-4 py-3 text-sm">
              {item.at} · {item.actor} · {item.action}
            </li>
          ))}
        </ul>
      )}
      {location.pathname.endsWith("integraciones") && (
        <ul className="grid gap-2">
          {workspace.integrations.map((item) => (
            <li key={item.id} className="glass-panel flex items-center justify-between rounded-[22px] px-4 py-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted">{item.note}</p>
              </div>
              <StatusBadge value={item.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
