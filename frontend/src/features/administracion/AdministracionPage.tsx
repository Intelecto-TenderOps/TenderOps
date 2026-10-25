import { NavLink, useLocation } from "react-router-dom";
import { DataTable, RichDate, RichPrimary, RichStage, RichValue, type RichColumn } from "@/components/data/DataTable";
import { PageHeader } from "@/components/data/PageHeader";
import { Button } from "@/components/ui/button";
import type { AuditEvent, IntegrationStatus, Membership, SourceConfig } from "@/contracts";
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

const userColumns: RichColumn<Membership>[] = [
  {
    id: "usuario",
    header: "Usuario",
    grow: true,
    sortValue: (row) => row.name,
    cell: (row) => <RichPrimary kicker={row.email} title={row.name} detail={row.team} />,
  },
  {
    id: "rol",
    header: "Rol",
    sortValue: (row) => row.role,
    cell: (row) => <RichValue primary={row.role} />,
  },
  {
    id: "etapa",
    header: "Etapa",
    sortValue: (row) => (row.active ? 1 : 0),
    cell: (row) => <RichStage label={row.active ? "Activo" : "Inactivo"} />,
  },
];

const sourceColumns: RichColumn<SourceConfig>[] = [
  {
    id: "fuente",
    header: "Fuente",
    grow: true,
    sortValue: (row) => row.name,
    cell: (row) => <RichPrimary kicker={row.country} title={row.name} detail={row.lastSync ? `Última sync ${row.lastSync}` : "Sin sincronizar"} />,
  },
  {
    id: "salud",
    header: "Salud",
    sortValue: (row) => row.health,
    cell: (row) => <RichValue primary={row.health} secondary={row.enabled ? "Activa" : "Inactiva"} />,
  },
];

const auditColumns: RichColumn<AuditEvent>[] = [
  {
    id: "evento",
    header: "Evento",
    grow: true,
    sortValue: (row) => row.action,
    cell: (row) => <RichPrimary kicker={row.correlationId} title={row.action} detail={`${row.actor} · ${row.entity}`} />,
  },
  {
    id: "fecha",
    header: "Fecha",
    sortValue: (row) => row.at,
    cell: (row) => <RichDate value={row.at} />,
  },
];

const integrationColumns: RichColumn<IntegrationStatus>[] = [
  {
    id: "integracion",
    header: "Integración",
    grow: true,
    sortValue: (row) => row.name,
    cell: (row) => <RichPrimary kicker={row.system} title={row.name} detail={row.note} />,
  },
  {
    id: "etapa",
    header: "Etapa",
    sortValue: (row) => row.status,
    cell: (row) => <RichStage label={row.status} />,
  },
];

export function AdministracionPage() {
  const location = useLocation();
  const workspace = useDemoStore((state) => state.workspace);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const section = tabs.find((tab) => tab.to === location.pathname)?.label ?? "Resumen";
  return (
    <section className="grid gap-3">
      <PageHeader eyebrow="Administración" title={section} />
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
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable
            data={workspace.memberships}
            columns={[
              ...userColumns,
              {
                id: "acciones",
                header: "Acciones",
                cell: (item) => (
                  <Button
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      openFlow({ type: "edit-user", title: "Administrar usuario", recordId: item.id });
                    }}
                  >
                    Editar
                  </Button>
                ),
              },
            ]}
            onRowClick={(item) => openFlow({ type: "edit-user", title: "Administrar usuario", recordId: item.id })}
          />
        </div>
      )}
      {location.pathname.endsWith("empresas") && (
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable
            data={workspace.companies}
            columns={[
              {
                id: "empresa",
                header: "Empresa",
                grow: true,
                sortValue: (row) => row.legalName,
                cell: (row) => <RichPrimary kicker={row.taxId} title={row.legalName} detail={`${row.city} · ${row.department}`} />,
              },
              {
                id: "etapa",
                header: "Etapa",
                sortValue: (row) => row.status,
                cell: (row) => <RichStage label={row.status} />,
              },
            ]}
          />
        </div>
      )}
      {location.pathname.endsWith("fuentes") && (
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable
            data={workspace.sources}
            columns={[
              ...sourceColumns,
              {
                id: "acciones",
                header: "Acciones",
                cell: (item) => (
                  <Button size="sm" onClick={() => void adminService.toggleSource(item.id)}>
                    {item.enabled ? "Desactivar" : "Activar"}
                  </Button>
                ),
              },
            ]}
          />
        </div>
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
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable data={workspace.auditEvents} columns={auditColumns} />
        </div>
      )}
      {location.pathname.endsWith("integraciones") && (
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable data={workspace.integrations} columns={integrationColumns} />
        </div>
      )}
    </section>
  );
}
