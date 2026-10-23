import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { SelectionChips } from "@/components/selection";
import { formatCurrency, formatDate } from "@/lib/format";
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
    <section className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Perfil empresarial</p>
          <h1 className="text-3xl font-semibold">{company?.legalName}</h1>
          <p className="text-sm text-muted">NIT {company?.taxId} · {company?.city}</p>
        </div>
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
      </header>
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
        <ul className="grid gap-3 md:grid-cols-2">
          {workspace.capabilities
            .filter((item) => item.companyId === companyId)
            .map((item) => (
              <li key={item.id} className="glass-panel rounded-[24px] p-4">
                <h2 className="font-semibold">{item.name}</h2>
                <p className="text-sm text-muted">{item.description}</p>
                <div className="mt-2">
                  <SelectionChips items={[{ id: item.sector, label: item.sector }]} />
                </div>
              </li>
            ))}
        </ul>
      )}
      {section === "experiencia" && (
        <ul className="grid gap-3">
          {workspace.experiences
            .filter((item) => item.companyId === companyId)
            .map((item) => (
              <li key={item.id} className="glass-panel rounded-[24px] p-4">
                <h2 className="font-semibold">{item.object}</h2>
                <p className="text-sm text-muted">
                  {item.client} · {item.contractNumber} · {formatCurrency(item.value)}
                </p>
                <p className="text-xs text-muted">
                  {formatDate(item.startDate)} — {formatDate(item.endDate)} · {item.complete ? "completa" : "pendiente"}
                </p>
              </li>
            ))}
        </ul>
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
        <ul className="grid gap-2">
          {workspace.companyDocuments
            .filter((item) => item.companyId === companyId)
            .map((item) => (
              <li key={item.id} className="glass-panel flex items-center justify-between rounded-[22px] px-4 py-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted">{item.type} · vence {item.validUntil}</p>
                </div>
                <StatusBadge value={item.status} />
              </li>
            ))}
        </ul>
      )}
      {section === "usuarios" && (
        <ul className="grid gap-2">
          {workspace.memberships
            .filter((item) => item.companyId === companyId)
            .map((item) => (
              <li key={item.id} className="glass-panel flex items-center justify-between rounded-[22px] px-4 py-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted">{item.role} · {item.team}</p>
                </div>
                <Button size="sm" onClick={() => openFlow({ type: "edit-user", title: "Editar usuario", recordId: item.id })}>
                  Editar
                </Button>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
