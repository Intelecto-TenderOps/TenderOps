import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3, ListChecks, Scale, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { formatCompact, formatDate, prettyLabel } from "@/lib/format";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDrawerStore } from "@/store/drawer-store";
import { useUiStore } from "@/store/ui-store";
import { bogotaLongDate, buildPanoramaPulse, daysFromToday } from "./panoramaPulse";

export function PanoramaPage() {
  const navigate = useNavigate();
  const openFlow = useDrawerStore((state) => state.openFlow);
  const companyId = useUiStore((state) => state.companyId);
  const workspace = useWorkspace();
  const company = workspace.companies.find((item) => item.id === companyId);
  const pulse = useMemo(
    () =>
      buildPanoramaPulse({
        tenders: workspace.tenders,
        tasks: workspace.tasks,
        memberships: workspace.memberships,
        alerts: workspace.alerts,
        opportunities: workspace.opportunities,
      }),
    [workspace],
  );
  const headline = pulse.overdueTasks.length
    ? `${pulse.overdueTasks.length} tareas vencidas y ${pulse.liveTenders.length} procesos vivos`
    : `${pulse.liveTenders.length} procesos vivos y ${pulse.openTasks.length} tareas en curso`;

  return (
    <section className="grid min-w-0 gap-3">
      <article className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgb(11_35_71/0.94),rgb(23_92_211/0.88)_55%,rgb(50_103_245/0.82))] px-5 py-6 text-white shadow-[0_24px_60px_rgb(11_35_71/0.28)] md:px-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan/20 blur-3xl" />
        <div className="relative grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan/90">Panorama ejecutivo</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-[32px]">El día de la mesa de licitaciones</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                {bogotaLongDate()} · {company?.tradeName ?? "Empresa activa"} · {headline}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-white text-corporate hover:bg-mist" onClick={() => navigate("/explorar")}>
                Explorar procesos
              </Button>
              <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate("/tareas")}>
                Tablero de tareas
              </Button>
            </div>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <HeroStat icon={<Scale size={16} />} label="Procesos vivos" value={pulse.liveTenders.length} hint={`${pulse.recommended.length} recomendados BID`} />
            <HeroStat
              icon={<Clock3 size={16} />}
              label="Cierran primero"
              value={pulse.closingSoon[0] ? `${Math.max(daysFromToday(pulse.closingSoon[0].closesAt), 0)}d` : "—"}
              hint={pulse.closingSoon[0]?.secopId ?? "Sin cierre próximo"}
            />
            <HeroStat
              icon={<ListChecks size={16} />}
              label="Tareas abiertas"
              value={pulse.openTasks.length}
              hint={pulse.overdueTasks.length ? `${pulse.overdueTasks.length} vencidas` : "Al día"}
              warn={pulse.overdueTasks.length > 0}
            />
            <HeroStat
              icon={<Users size={16} />}
              label="Actores con carga"
              value={pulse.loadedActors.length}
              hint={`${formatCompact(pulse.pipelineValue)} en pipeline BID`}
            />
          </dl>
        </div>
      </article>

      <div className="grid min-w-0 gap-3 xl:grid-cols-3">
        <article className="glass-panel min-w-0 rounded-[24px] p-4">
          <header className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Actores y carga</h2>
            <Button size="sm" onClick={() => navigate("/administracion/usuarios")}>
              Equipo
            </Button>
          </header>
          <ul className="grid gap-2">
            {pulse.actors.map((actor) => (
              <li key={actor.id} className="rounded-2xl bg-white/70 px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-electric text-xs font-bold text-white">
                    {actor.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{actor.name}</p>
                      <span className="text-[11px] text-muted">{actor.role}</span>
                    </div>
                    <p className="text-xs text-muted">
                      {actor.openTasks} tareas · {actor.processes} procesos
                      {actor.overdueTasks ? ` · ${actor.overdueTasks} vencidas` : ""}
                    </p>
                    {actor.nextTask ? (
                      <p className="mt-1 truncate text-xs text-ink">Siguiente: {actor.nextTask.title}</p>
                    ) : (
                      <p className="mt-1 text-xs text-muted">Sin tareas abiertas</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="glass-panel min-w-0 rounded-[24px] p-4">
          <header className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Tareas que no pueden esperar</h2>
            <Button size="sm" onClick={() => navigate("/tareas")}>
              Ver todas
            </Button>
          </header>
          <ul className="grid gap-2">
            {pulse.focusTasks.map((task) => {
              const overdue = daysFromToday(task.dueDate) < 0;
              const tender = workspace.tenders.find((item) => item.id === task.tenderId);
              return (
                <li key={task.id} className="rounded-2xl bg-white/70 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{task.title}</p>
                      <p className="text-xs text-muted">
                        {task.owners.join(", ") || "Sin asignar"}
                        {tender ? ` · ${tender.secopId}` : ""}
                      </p>
                    </div>
                    <StatusBadge value={overdue ? "vencido" : task.priority} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted">
                      {prettyLabel(task.status)} · {formatDate(task.dueDate)}
                    </p>
                    <Button
                      size="sm"
                      onClick={() =>
                        openFlow({ type: "edit-task", title: "Editar tarea", recordId: task.id, size: "compact" })
                      }
                    >
                      Abrir
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="glass-panel min-w-0 rounded-[24px] p-4">
          <header className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Procesos que mueven la mesa</h2>
            <Button size="sm" onClick={() => navigate("/procesos")}>
              Expedientes
            </Button>
          </header>
          <ul className="grid gap-2">
            {pulse.closingSoon.map((tender) => {
              const days = daysFromToday(tender.closesAt);
              const related = workspace.tasks.filter(
                (task) => task.tenderId === tender.id && task.status !== "hecha",
              ).length;
              return (
                <li key={tender.id}>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-white/70 px-3 py-2.5 text-left hover:bg-[var(--to-table-hover)]"
                    onClick={() => navigate(`/procesos/${tender.secopId}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted">
                          {tender.secopId} · {tender.owner}
                        </p>
                        <p className="truncate text-sm font-semibold">{tender.object}</p>
                      </div>
                      <StatusBadge value={tender.recommendation} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatCompact(tender.value)} · encaje {tender.compatibility}% · {related} tareas
                      {days >= 0 ? ` · cierra en ${days}d` : " · cerrado"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </article>
      </div>

      <article className="glass-panel min-w-0 rounded-[24px] p-4">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Alertas sin leer</h2>
          <Button size="sm" onClick={() => navigate("/alertas")}>
            Bandeja
          </Button>
        </header>
        {pulse.alerts.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {pulse.alerts.map((alert) => (
              <li key={alert.id} className="rounded-2xl bg-white/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <StatusBadge value={alert.urgency} />
                  <strong className="text-sm">{alert.title}</strong>
                </div>
                <p className="mt-1 text-xs text-muted">{alert.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No hay alertas pendientes de lectura.</p>
        )}
      </article>
    </section>
  );
}

function HeroStat({
  icon,
  label,
  value,
  hint,
  warn,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-2xl font-semibold ${warn ? "text-amber-200" : "text-white"}`}>{value}</p>
      <p className="text-xs text-white/70">{hint}</p>
    </div>
  );
}
