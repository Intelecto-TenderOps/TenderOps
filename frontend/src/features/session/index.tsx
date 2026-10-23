import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { http, failure, queryClient } from "../../shared/api";

export interface AuthorizedCompany {
  id: string;
  name: string;
  permissions: string[];
}
export interface Session {
  name: string;
  companies: AuthorizedCompany[];
  csrfToken: string;
  mode: string;
}
export const useSession = (enabled = true) =>
  useQuery({
    queryKey: ["session"],
    queryFn: async ({ signal }): Promise<Session> =>
      (await http.get<Session>("/session", { signal })).data,
    retry: false,
    enabled,
  });
export function Login(): ReactElement {
  const csrf = useQuery({
    queryKey: ["csrf"],
    queryFn: async () =>
      (await http.get<{ token: string; demo: boolean }>("/csrf")).data,
    retry: false,
  });
  const login = useMutation({
    mutationFn: async (alias: string) =>
      http.post(
        "/demo/login/" + alias,
        {},
        { headers: { "X-CSRF-TOKEN": csrf.data?.token } },
      ),
    onSuccess: () => {
      queryClient.clear();
      window.location.assign("/");
    },
  });
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand">
          <Building2 aria-hidden="true" /> TenderOps
        </div>
        <p className="eyebrow">LICITACIONES CON CONTEXTO</p>
        <h1>De la oportunidad a una propuesta bien sustentada.</h1>
        <p>
          Descubre procesos, revisa la evidencia y coordina cada decisión y
          entregable con tu equipo.
        </p>
        <p className="login-note">
          <ShieldCheck aria-hidden="true" /> Acceso por empresa y función.
        </p>
      </section>
      <section className="login-panel">
        <p className="eyebrow">TU ESPACIO DE TRABAJO</p>
        <h2>Acceder a TenderOps</h2>
        <p>Usa la cuenta de Microsoft de tu organización.</p>
        {csrf.isPending ? (
          <p role="status">Preparando el acceso…</p>
        ) : csrf.isError ? (
          <div role="alert">
            <p>No se pudo conectar con el servicio de acceso.</p>
            <button onClick={() => void csrf.refetch()}>
              Reintentar conexión
            </button>
          </div>
        ) : csrf.data.demo ? (
          <>
            <p className="notice">
              Acceso al backend local del perfil. Los datos son ficticios y se
              reinician al cerrar el servidor.
            </p>
            <div className="demo-options">
              {[
                ["admin", "Administrador"],
                ["analyst", "Analista"],
                ["finance", "Financiero"],
                ["approver", "Aprobador"],
                ["other", "Otra empresa"],
              ].map(([alias, label]) => (
                <button
                  key={alias}
                  disabled={login.isPending}
                  onClick={() => login.mutate(alias)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <a className="primary" href="/auth/login">
            Continuar con Microsoft
          </a>
        )}
        {login.isError && <p role="alert">{failure(login.error)}</p>}
        <div className="demo-entry">
          <span>CONOCE EL FLUJO COMPLETO</span>
          <Link to="/demo">
            Explorar demostración interactiva{" "}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <p>
            Datos ficticios, siete funciones y dos empresas. No requiere
            conexión ni modifica información real.
          </p>
        </div>
      </section>
    </main>
  );
}
