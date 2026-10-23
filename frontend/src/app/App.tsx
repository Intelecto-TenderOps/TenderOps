import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  Compass,
  FolderCheck,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Unplug,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Login, useSession } from "../features/session";
import type { Session } from "../features/session";
import { Profile, definitions } from "../features/profile";
import {
  WorkbenchRoutes,
  demoCompanyIds,
  demoPermissions,
  demoRoles,
  LiveAudit,
  profileTransport,
  roleLabels,
} from "../features/workbench";
import type { ViewRole, WorkbenchContext } from "../features/workbench";
import { commandHeaders, http, failure } from "../shared/api";
import { useUi } from "../shared/ui-store";

const navigation: {
  title: string;
  items: { path: string; label: string; icon: LucideIcon }[];
}[] = [
  {
    title: "TRABAJO DIARIO",
    items: [
      { path: "overview", label: "Mi bandeja", icon: LayoutDashboard },
      { path: "opportunities", label: "Oportunidades", icon: Compass },
      { path: "saved-searches", label: "Búsquedas guardadas", icon: Search },
      { path: "compare", label: "Comparar procesos", icon: GitCompareArrows },
      { path: "alerts", label: "Alertas", icon: Bell },
    ],
  },
  {
    title: "PROPUESTAS Y EQUIPO",
    items: [
      { path: "tasks", label: "Tareas del equipo", icon: ClipboardList },
      { path: "dynamics", label: "Dynamics 365", icon: FolderCheck },
      {
        path: "company-documents",
        label: "Vigencia documental",
        icon: FolderCheck,
      },
    ],
  },
  {
    title: "CONTROL Y GOBIERNO",
    items: [
      { path: "sources", label: "Fuentes", icon: Unplug },
      { path: "analytics", label: "Indicadores", icon: BarChart3 },
      { path: "operations", label: "Operación", icon: Activity },
      { path: "audit", label: "Auditoría", icon: ShieldCheck },
      { path: "settings", label: "Configuración", icon: Settings2 },
    ],
  },
];
export function App(): ReactElement {
  const location = useLocation();
  const demo =
    location.pathname === "/demo" || location.pathname.startsWith("/demo/");
  const session = useSession(!demo);
  if (demo) return <DemoApplication />;
  if (session.isPending)
    return (
      <main className="empty" role="status">
        Preparando tu espacio de trabajo…
      </main>
    );
  if (session.isError) return <Login />;
  return (
    <ProductWorkspace session={session.data} demo={false} role="Auditor" />
  );
}
function DemoApplication(): ReactElement {
  const [role, setRole] = useState<ViewRole>("Administrator");
  const session: Session = {
    name: `Vista de ${roleLabels[role]}`,
    mode: "Demostración interactiva",
    csrfToken: "",
    companies: demoCompanyIds.map((id, index) => ({
      id,
      name: index ? "Oriente Soluciones SAS" : "Andina Tecnología SAS",
      permissions: demoPermissions(role),
    })),
  };
  return (
    <ProductWorkspace session={session} demo role={role} changeRole={setRole} />
  );
}
function ProductWorkspace({
  session,
  demo,
  role,
  changeRole,
}: {
  session: Session;
  demo: boolean;
  role: ViewRole;
  changeRole?: (role: ViewRole) => void;
}): ReactElement {
  const companyId = useUi((state) => state.companyId);
  const select = useUi((state) => state.selectCompany);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const main = useRef<HTMLElement>(null);
  const company =
    session.companies.find((item) => item.id === companyId) ??
    session.companies[0];
  const base = demo ? "/demo" : "/app";
  const context: WorkbenchContext = {
    companyId: company?.id ?? "",
    companyName: company?.name ?? "",
    demo,
    role,
    csrf: session.csrfToken,
    permissions: company?.permissions ?? [],
    base,
  };
  const selection = useMutation({
    mutationFn: async (id: string) => {
      if (!session.companies.some((item) => item.id === id))
        throw new Error("Empresa no autorizada");
      if (!demo)
        await http.post(
          `/v1/companies/${id}/select`,
          {},
          { headers: commandHeaders(session.csrfToken) },
        );
      await cache.cancelQueries();
      cache.clear();
      select(id);
    },
  });
  useEffect(() => {
    document.title =
      "TenderOps · " +
      (navigation
        .flatMap((group) => group.items)
        .find((item) => location.pathname.includes("/" + item.path))?.label ??
        "Perfil empresarial");
    main.current?.focus({ preventScroll: true });
  }, [location.pathname]);
  function closeNavigation(): void {
    setMenuOpen(false);
  }
  return (
    <div className="product-workspace">
      <a className="skip" href="#content">
        Ir al contenido
      </a>
      <aside
        className={`app-sidebar ${menuOpen ? "is-open" : ""}`}
        id="app-navigation"
      >
        <div className="sidebar-brand">
          <NavLink
            to={base + "/overview"}
            onClick={closeNavigation}
            aria-label="TenderOps, mi bandeja"
          >
            <span className="brand-symbol" aria-hidden="true">
              <Building2 size={23} />
            </span>
            <span>
              TenderOps<small>ESPACIO DE LICITACIONES</small>
            </span>
          </NavLink>
          <button
            className="mobile-close"
            aria-label="Cerrar navegación"
            onClick={closeNavigation}
          >
            <X size={18} />
          </button>
        </div>
        <div className="company-switch">
          <label htmlFor="active-company">EMPRESA ACTIVA</label>
          {company && (
            <select
              id="active-company"
              value={company.id}
              disabled={selection.isPending}
              onChange={(event) => selection.mutate(event.target.value)}
            >
              {session.companies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          {!demo && (
            <NavLink to={base + "/companies/new"} onClick={closeNavigation}>
              + Registrar empresa
            </NavLink>
          )}
        </div>
        <nav aria-label="Navegación principal">
          {navigation.map((group) => (
            <div className="navigation-group" key={group.title}>
              <p>{group.title}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={base + "/" + item.path}
                  onClick={closeNavigation}
                >
                  <item.icon size={17} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.path === "dynamics" && (
                    <ArrowUpRight
                      className="nav-tail"
                      size={12}
                      aria-hidden="true"
                    />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
          <details className="profile-navigation" open>
            <summary>
              <Building2 size={17} aria-hidden="true" /> Mi empresa{" "}
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <div>
              {definitions
                .filter((item) =>
                  company?.permissions.includes(
                    item.kind === "financial"
                      ? "financial.read"
                      : ["membership", "team"].includes(item.kind)
                        ? "members.read"
                        : "profile.read",
                  ),
                )
                .map((item) => (
                  <NavLink
                    key={item.kind}
                    to={base + "/profile/" + item.kind}
                    onClick={closeNavigation}
                  >
                    {item.title}
                  </NavLink>
                ))}
            </div>
          </details>
        </nav>
        <div className="app-sidebar-footer">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>
            Tu empresa. Su evidencia.
            <br />
            Decisiones con contexto.
          </span>
        </div>
      </aside>
      <div className="product-main">
        <header className="app-topbar">
          <div>
            <button
              className="mobile-menu"
              aria-label={menuOpen ? "Ocultar navegación" : "Abrir navegación"}
              aria-expanded={menuOpen}
              aria-controls="app-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <span className="breadcrumb">
              Espacio de trabajo <span aria-hidden="true">/</span>{" "}
              <strong>{company?.name ?? "Nueva empresa"}</strong>
            </span>
          </div>
          <div className="topbar-tools">
            <NavLink
              className="icon-button"
              aria-label="Abrir alertas"
              to={base + "/alerts"}
            >
              <Bell size={19} aria-hidden="true" />
            </NavLink>
            <div className="user-identity">
              <span className="avatar" aria-hidden="true">
                {demo ? "DM" : "US"}
              </span>
              <span>
                {session.name}
                <small>
                  {demo ? "Vista de demostración" : "Sesión autorizada"}
                </small>
              </span>
            </div>
            {demo ? (
              <button
                onClick={() => {
                  cache.clear();
                  select("");
                  navigate("/");
                }}
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Salir de la demo</span>
              </button>
            ) : (
              <form
                method="post"
                action="/api/logout"
                onSubmit={() => {
                  cache.clear();
                  select("");
                }}
              >
                <input
                  type="hidden"
                  name="__RequestVerificationToken"
                  value={session.csrfToken}
                />
                <button type="submit">
                  <LogOut size={16} aria-hidden="true" /> Salir
                </button>
              </form>
            )}
          </div>
        </header>
        {demo ? (
          <div className="demo-banner">
            <div>
              <span className="demo-indicator" aria-hidden="true" />
              <strong>Demostración interactiva</strong>
              <span>
                Datos ficticios · se reinician al recargar · referencia 22 oct
                2026
              </span>
            </div>
            <label>
              Vista de función
              <select
                aria-label="Vista de función"
                value={role}
                onChange={(event) => {
                  cache.removeQueries({ queryKey: ["profile"] });
                  changeRole?.(event.target.value as ViewRole);
                }}
              >
                {demoRoles.map((value) => (
                  <option key={value} value={value}>
                    {roleLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="connection-banner">
            <span>{session.mode}</span>
            <NavLink to="/demo/overview">
              Explorar el flujo completo de demostración{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </NavLink>
          </div>
        )}
        <main
          id="content"
          ref={main}
          tabIndex={-1}
          key={context.companyId + role}
        >
          {selection.isError && (
            <p role="alert" className="error">
              {failure(selection.error)}
            </p>
          )}
          {!company ? (
            <CreateCompany
              csrf={session.csrfToken}
              onClose={() => navigate(base + "/profile/company")}
            />
          ) : (
            <Routes>
              <Route
                path={base + "/profile/:kind"}
                element={<ProfileRoute context={context} />}
              />
              <Route
                path="/profile/:kind"
                element={<ProfileRoute context={context} />}
              />
              <Route
                path={base + "/companies/new"}
                element={
                  <CreateCompany
                    csrf={session.csrfToken}
                    onClose={() => navigate(base + "/profile/company")}
                  />
                }
              />
              {!demo && (
                <Route
                  path={base + "/audit"}
                  element={<LiveAudit context={context} />}
                />
              )}
              <Route
                path={base + "/*"}
                element={<WorkbenchRoutes context={context} />}
              />
              <Route
                path="*"
                element={
                  <Navigate
                    to={base + (demo ? "/overview" : "/profile/company")}
                    replace
                  />
                }
              />
            </Routes>
          )}
        </main>
        <footer className="workspace-footer">
          <span>TenderOps · licitaciones con evidencia</span>
          <span>
            {demo
              ? "Entorno de demostración"
              : "Acceso limitado a empresas autorizadas"}{" "}
            · v0.2
          </span>
        </footer>
      </div>
    </div>
  );
}
function ProfileRoute({
  context,
}: {
  context: WorkbenchContext;
}): ReactElement {
  const { kind = "company" } = useParams();
  const definition = definitions.find((item) => item.kind === kind);
  const permission =
    kind === "financial"
      ? "financial.read"
      : ["membership", "team"].includes(kind)
        ? "members.read"
        : "profile.read";
  if (!definition || !context.permissions.includes(permission))
    return (
      <section>
        <h1>Acceso no disponible</h1>
        <p>Selecciona una sección autorizada en el menú.</p>
      </section>
    );
  return (
    <Profile
      key={context.companyId + kind + context.role}
      companyId={context.companyId}
      kind={kind}
      csrf={context.csrf}
      permissions={context.permissions}
      transport={context.demo ? profileTransport(context) : undefined}
    />
  );
}
function CreateCompany({
  csrf,
  onClose,
}: {
  csrf: string;
  onClose: () => void;
}): ReactElement {
  const [error, setError] = useState<string>("");
  const cache = useQueryClient();
  const select = useUi((state) => state.selectCompany);
  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      (
        await http.post<{ id: string }>("/v1/companies", data, {
          headers: commandHeaders(csrf),
        })
      ).data,
    onSuccess: async (data) => {
      select(data.id);
      await cache.invalidateQueries({ queryKey: ["session"] });
      onClose();
    },
  });
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MI EMPRESA</p>
          <h1>Registrar empresa</h1>
          <p>Quedarás como administrador de este espacio de trabajo.</p>
        </div>
      </div>
      <form
        className="editor"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = definitions[0].schema.safeParse(
            Object.fromEntries(new FormData(event.currentTarget)),
          );
          if (!result.success) {
            setError(result.error.issues[0].message);
            event.currentTarget
              .querySelector<HTMLElement>(
                `[name="${String(result.error.issues[0].path[0])}"]`,
              )
              ?.focus();
            return;
          }
          setError("");
          mutation.mutate(result.data);
        }}
      >
        {definitions[0].fields.map((field) => (
          <div className="field" key={field.key}>
            <label htmlFor={"create-" + field.key}>{field.label}</label>
            <input
              name={field.key}
              id={"create-" + field.key}
              defaultValue={field.key === "countryCode" ? "CO" : ""}
            />
          </div>
        ))}
        {error && <p role="alert">{error}</p>}
        {mutation.isError && <p role="alert">{failure(mutation.error)}</p>}
        <footer>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Registrando…" : "Registrar empresa"}
          </button>
        </footer>
      </form>
    </section>
  );
}
