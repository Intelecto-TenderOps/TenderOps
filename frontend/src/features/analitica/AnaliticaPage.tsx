import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ActiveFilterChips } from "@/components/selection";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/viz/KpiCard";
import { useFilterChips } from "@/hooks/useFilterChips";
import { analyticsService } from "@/services/analyticsService";
import { useDrawerStore } from "@/store/drawer-store";

export function AnaliticaPage() {
  const { data } = useQuery({ queryKey: ["analytics"], queryFn: () => analyticsService.snapshot() });
  const { chips, setChips } = useFilterChips();
  const openFlow = useDrawerStore((state) => state.openFlow);
  const byModality = (data?.byModality ?? []).filter((item) =>
    chips.every((chip) => (chip.field === "source" ? true : chip.field !== "modality" || chip.value === item.name)),
  );
  return (
    <section className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Analítica</p>
          <h1 className="text-3xl font-semibold">Operación y resultado</h1>
        </div>
        <Button
          onClick={() =>
            openFlow({
              type: "filters-generic",
              title: "Filtros analíticos",
              size: "compact",
              payload: {
                active: chips,
                onApply: setChips,
                fields: [
                  { field: "source", label: "Fuente", options: ["SECOP II"] },
                  { field: "modality", label: "Modalidad", options: data?.byModality.map((item) => item.name) ?? [] },
                ],
              },
            })
          }
        >
          Filtros
        </Button>
      </header>
      <ActiveFilterChips chips={chips} onRemove={(id) => setChips(chips.filter((chip) => chip.id !== id))} onClear={() => setChips([])} />
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Tasa de éxito" value={`${data?.winRate ?? 0}%`} />
        <KpiCard label="En Dynamics" value={data?.inDynamics ?? 0} />
        <KpiCard label="Tareas vencidas" value={data?.overdueTasks ?? 0} tone="warn" />
        <KpiCard label="Recomendadas" value={data?.recommended ?? 0} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <article className="glass-panel h-80 rounded-[24px] p-4">
          <h2 className="mb-2 text-sm font-semibold">Distribución por modalidad</h2>
          <ResponsiveContainer>
            <BarChart data={byModality}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7e6ff" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3267F5" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="glass-panel h-80 rounded-[24px] p-4">
          <h2 className="mb-2 text-sm font-semibold">Valor por entidad</h2>
          <ResponsiveContainer>
            <BarChart data={data?.byEntity ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7e6ff" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-18} height={70} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4A90FF" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  );
}
