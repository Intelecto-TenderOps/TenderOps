import { NavLink, useLocation } from "react-router-dom";
import { DataTable, RichDate, RichMoney, RichPrimary, RichStage, RichValue } from "@/components/data/DataTable";
import { PageHeader } from "@/components/data/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { SelectionChips } from "@/components/selection";
import { formatCurrency } from "@/lib/format";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";
import { useUiStore } from "@/store/ui-store";

const tabs = [
  { to: "/empresa", label: "Datos legales", id: "datos" },
  { to: "/empresa/capacidades", label: "Capacidades", id: "capacidades" },
  { to: "/empresa/experiencia", label: "Experiencia", id: "experiencia" },
  { to: "/empresa/financiera", label: "Capacidad financiera", id: "financiera" },
  { to: "/empresa/cobertura", label: "Cobertura", id: "cobertura" },
  { to: "/empresa/reglas", label: "Reglas", id: "reglas" },
  { to: "/empresa/documentos", label: "Documentos", id: "documentos" },
  { to: "/empresa/usuarios", label: "Usuarios y equipos", id: "usuarios" },
];

export function EmpresaPage() {
  const location = useLocation();
  const companyId = useUiStore((state) => state.companyId);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const workspace = useDemoStore((state) => state.workspace);
  const company = workspace.companies.find((item) => item.id === companyId);
  const section = tabs.find((tab) => tab.to === location.pathname)?.id ?? "datos";

  return (
    <section className="grid gap-3">
      <PageHeader
        eyebrow="Perfil empresarial"
        title={company?.legalName ?? "Empresa"}
        actions={
          <Button
            variant="primary"
            onClick={() =>
              section === "experiencia"
                ? openFlow({
                    type: "create-experience",
                    title: "Registrar experiencia",
                    size: "standard",
                    steps: ["Datos generales", "Cliente y contrato", "Valores y fechas", "Documentos", "Revisión"],
                  })
                : section === "capacidades"
                  ? openFlow({ type: "create-capability", title: "Añadir capacidad", size: "standard" })
                  : openFlow({ type: "edit-company", title: "Editar empresa", size: "standard" })
            }
          >
            {section === "experiencia" ? "Registrar experiencia" : section === "capacidades" ? "Añadir registro" : "Editar"}
          </Button>
        }
      />
      <nav className="flex flex-wrap gap-2" aria-label="Secciones de empresa">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/empresa"}
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 text-sm ${isActive ? "bg-electric text-white" : "glass-panel"}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {section === "datos" && company && (
        <article className="glass-panel rounded-[24px] p-5 text-sm">
          <dl className="grid gap-3 md:grid-cols-2">
            <div><dt className="text-muted">Razón social</dt><dd>{company.legalName}</dd></div>
            <div><dt className="text-muted">Nombre comercial</dt><dd>{company.tradeName}</dd></div>
            <div><dt className="text-muted">Correo</dt><dd>{company.email}</dd></div>
            <div><dt className="text-muted">Representante</dt><dd>{company.legalRep}</dd></div>
          </dl>
        </article>
      )}
      {section === "capacidades" && (
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable
            data={workspace.capabilities.filter((item) => item.companyId === companyId)}
            columns={[
              {
                id: "capacidad",
                header: "Capacidad",
                grow: true,
                sortValue: (row) => row.name,
                cell: (row) => <RichPrimary kicker={row.sector} title={row.name} detail={row.description} />,
              },
              {
                id: "vigencia",
                header: "Vigencia",
                sortValue: (row) => row.validUntil,
                cell: (row) => <RichDate value={row.validUntil} />,
              },
              {
                id: "etapa",
                header: "Etapa",
                sortValue: (row) => (row.active ? 1 : 0),
                cell: (row) => <RichStage label={row.active ? "Activa" : "Inactiva"} />,
              },
            ]}
          />
        </div>
      )}
      {section === "experiencia" && (
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable
            data={workspace.experiences.filter((item) => item.companyId === companyId)}
            columns={[
              {
                id: "experiencia",
                header: "Contrato / cliente",
                grow: true,
                sortValue: (row) => row.object,
                cell: (row) => (
                  <RichPrimary kicker={row.contractNumber} title={row.object} detail={`${row.client} · ${row.location}`} />
                ),
              },
              {
                id: "presupuesto",
                header: "Presupuesto",
                sortValue: (row) => row.value,
                cell: (row) => <RichMoney value={row.value} hint={row.evidenceName} />,
              },
              {
                id: "cierre",
                header: "Cierre",
                sortValue: (row) => row.endDate,
                cell: (row) => <RichDate value={row.endDate} />,
              },
              {
                id: "etapa",
                header: "Etapa",
                sortValue: (row) => (row.complete ? 1 : 0),
                cell: (row) => <RichStage label={row.complete ? "Completa" : "Pendiente"} />,
              },
            ]}
          />
        </div>
      )}
      {section === "financiera" &&
        workspace.financials
          .filter((item) => item.companyId === companyId)
          .map((item) => (
            <article key={item.id} className="glass-panel rounded-[24px] p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Periodo {item.period}</h2>
                <StatusBadge value={item.status} />
              </div>
              <p className="text-sm">Patrimonio {formatCurrency(item.equity)}</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => openFlow({ type: "edit-financial", title: "Actualizar capacidad financiera", recordId: item.id })}
              >
                Actualizar
              </Button>
            </article>
          ))}
      {section === "cobertura" && (
        <div className="glass-panel rounded-[24px] p-4">
          <SelectionChips
            items={workspace.coverage
              .filter((item) => item.companyId === companyId)
              .map((item) => ({ id: item.id, label: `${item.kind}: ${item.department}` }))}
          />
          <Button className="mt-3" onClick={() => openFlow({ type: "edit-coverage", title: "Cobertura geográfica" })}>
            Configurar cobertura
          </Button>
        </div>
      )}
      {section === "reglas" &&
        workspace.rules
          .filter((item) => item.companyId === companyId)
          .map((item) => (
            <article key={item.id} className="glass-panel rounded-[24px] p-4">
              <h2 className="font-semibold">{item.name}</h2>
              <p className="font-mono text-xs">{item.expression}</p>
              <StatusBadge value={item.blocking ? "alto" : "bajo"} />
            </article>
          ))}
      {section === "documentos" && (
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable
            data={workspace.companyDocuments.filter((item) => item.companyId === companyId)}
            columns={[
              {
                id: "documento",
                header: "Documento",
                grow: true,
                sortValue: (row) => row.name,
                cell: (row) => <RichPrimary kicker={row.type} title={row.name} />,
              },
              {
                id: "vigencia",
                header: "Vigencia",
                sortValue: (row) => row.validUntil,
                cell: (row) => <RichDate value={row.validUntil} />,
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
      {section === "usuarios" && (
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable
            data={workspace.memberships.filter((item) => item.companyId === companyId)}
            columns={[
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
                id: "acciones",
                header: "Acciones",
                cell: (row) => (
                  <Button size="sm" onClick={() => openFlow({ type: "edit-user", title: "Editar usuario", recordId: row.id })}>
                    Editar
                  </Button>
                ),
              },
            ]}
            onRowClick={(item) => openFlow({ type: "edit-user", title: "Editar usuario", recordId: item.id })}
          />
        </div>
      )}
    </section>
  );
}
