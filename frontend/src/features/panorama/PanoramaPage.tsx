import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { KpiCard } from "@/components/viz/KpiCard";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { Button } from "@/components/ui/button";
import { analyticsService } from "@/services/analyticsService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function PanoramaPage() {
  const navigate = useNavigate();
  const openFlow = useDrawerStore((state) => state.openFlow);
  const { data } = useQuery({ queryKey: ["analytics"], queryFn: () => analyticsService.snapshot() });
  const alerts = useDemoStore((state) => state.workspace.alerts.filter((item) => !item.silenced).slice(0, 4));
  const tasks = useDemoStore((state) =>
    state.workspace.tasks.filter((item) => item.status !== "hecha").slice(0, 4),
  );
  const tenders = useDemoStore((state) => state.workspace.tenders.slice(0, 5));

  return (
    <section className="grid gap-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Panorama ejecutivo</p>
        <h1 className="text-3xl font-semibold tracking-tight">El día de la mesa de licitaciones</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Indicadores simulados de detección, calificación y preparación. Las acciones abren paneles laterales.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Detectadas" value={data?.detected ?? "—"} />
        <KpiCard label="Evaluadas" value={data?.evaluated ?? "—"} />
        <KpiCard label="Recomendadas" value={data?.recommended ?? "—"} tone="good" />
        <KpiCard label="Descartadas" value={data?.discarded ?? "—"} />
        <KpiCard label="Próximas a cierre" value={data?.closingSoon ?? "—"} tone="warn" />
        <KpiCard label="En Dynamics 365" value={data?.inDynamics ?? "—"} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <article className="glass-panel rounded-[24px] p-4">
          <h2 className="text-sm font-semibold">Embudo comercial simulado</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data?.funnel ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e6ff" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area dataKey="count" stroke="#3267F5" fill="#4A90FF33" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="glass-panel rounded-[24px] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tareas vencidas o próximas</h2>
            <Button size="sm" onClick={() => navigate("/tareas")}>Ver tablero</Button>
          </div>
          <ul className="mt-3 grid gap-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted">{task.dueDate} · {task.owners.join(", ")}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    openFlow({ type: "edit-task", title: "Editar tarea", recordId: task.id, size: "compact" })
                  }
                >
                  Abrir
                </Button>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <article className="glass-panel rounded-[24px] p-4">
          <h2 className="text-sm font-semibold">Alertas recientes</h2>
          <ul className="mt-3 grid gap-2">
            {alerts.map((alert) => (
              <li key={alert.id} className="rounded-2xl bg-white/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <StatusBadge value={alert.urgency} />
                  <strong className="text-sm">{alert.title}</strong>
                </div>
                <p className="text-xs text-muted">{alert.detail}</p>
              </li>
            ))}
          </ul>
        </article>
        <article className="glass-panel rounded-[24px] p-4">
          <h2 className="text-sm font-semibold">Actividad de procesos</h2>
          <ul className="mt-3 grid gap-2">
            {tenders.map((tender) => (
              <li key={tender.id} className="flex items-center justify-between gap-2">
                <button type="button" className="text-left text-sm" onClick={() => navigate(`/procesos/${tender.secopId}`)}>
                  <strong>{tender.secopId}</strong>
                  <p className="text-xs text-muted">{tender.object}</p>
                </button>
                <StatusBadge value={tender.recommendation} />
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
