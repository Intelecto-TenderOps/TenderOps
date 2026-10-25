import { useMemo, useState } from "react";
import { DataTable, RichDate, RichPrimary, RichStage, RichValue, type RichColumn } from "@/components/data/DataTable";
import { PageHeader } from "@/components/data/PageHeader";
import { IntegrationNotice } from "@/components/status/IntegrationNotice";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { Button } from "@/components/ui/button";
import { ActiveFilterChips } from "@/components/selection";
import type { WorkTask } from "@/contracts";
import { useFilterChips } from "@/hooks/useFilterChips";
import { useIntegrations } from "@/hooks/useIntegrations";
import { prettyLabel } from "@/lib/format";
import { findIntegration } from "@/lib/integration";
import { people } from "@/mocks/catalogs";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

const columns: RichColumn<WorkTask>[] = [
  {
    id: "tarea",
    header: "Tarea",
    grow: true,
    sortValue: (row) => row.title,
    cell: (row) => <RichPrimary kicker={row.category} title={row.title} detail={row.description || undefined} />,
  },
  {
    id: "responsables",
    header: "Responsables",
    sortValue: (row) => row.owners.join(", "),
    cell: (row) => <RichValue primary={row.owners.join(", ") || "Sin asignar"} secondary={row.dynamicsTaskId ?? undefined} />,
  },
  {
    id: "prioridad",
    header: "Prioridad",
    sortValue: (row) => row.priority,
    cell: (row) => <RichValue primary={prettyLabel(row.priority)} />,
  },
  {
    id: "etapa",
    header: "Etapa",
    sortValue: (row) => row.status,
    cell: (row) => <RichStage label={row.status} />,
  },
  {
    id: "cierre",
    header: "Cierre",
    sortValue: (row) => row.dueDate,
    cell: (row) => <RichDate value={row.dueDate} />,
  },
];

export function TareasPage() {
  const { chips, setChips } = useFilterChips();
  const tasks = useDemoStore((state) => state.workspace.tasks);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const integrations = useIntegrations();
  const dynamics = findIntegration(integrations.data?.items, "Dynamics 365");
  const [view, setView] = useState<"lista" | "kanban" | "calendario" | "mias" | "equipo" | "carga">("lista");
  const rows = useMemo(() => {
    return tasks.filter((task) => {
      if (chips.some((chip) => chip.field === "owner" && !task.owners.includes(chip.value))) return false;
      if (chips.some((chip) => chip.field === "status" && task.status !== chip.value)) return false;
      if (chips.some((chip) => chip.field === "priority" && task.priority !== chip.value)) return false;
      if (view === "mias" && !task.owners.includes("Valentina Herrera")) return false;
      return true;
    });
  }, [tasks, chips, view]);
  const load = people.map((person) => ({
    name: person.name,
    count: tasks.filter((task) => task.owners.includes(person.name) && task.status !== "hecha").length,
  }));

  return (
    <section className="grid gap-2">
      <PageHeader
        eyebrow="Tareas y equipo"
        title="Trabajo en curso"
        actions={
          <>
            {(["lista", "kanban", "calendario", "mias", "equipo", "carga"] as const).map((item) => (
              <Button key={item} size="sm" variant={view === item ? "primary" : "secondary"} onClick={() => setView(item)}>
                {item}
              </Button>
            ))}
            <Button
              onClick={() =>
                openFlow({
                  type: "filters-generic",
                  title: "Filtros de tareas",
                  size: "compact",
                  payload: {
                    active: chips,
                    onApply: setChips,
                    fields: [
                      { field: "owner", label: "Responsable", options: people.map((person) => person.name) },
                      { field: "status", label: "Estado", options: ["pendiente", "en_curso", "bloqueada", "hecha"] },
                      { field: "priority", label: "Prioridad", options: ["baja", "media", "alta", "urgente"] },
                    ],
                  },
                })
              }
            >
              Filtros
            </Button>
            <Button variant="primary" onClick={() => openFlow({ type: "create-task", title: "Crear tarea", size: "standard" })}>
              Crear
            </Button>
          </>
        }
      />
      <IntegrationNotice
        title={dynamics?.configured ? "Dynamics 365 configurado" : "Dynamics 365 no configurado"}
        detail="El tablero local no crea Task en Dynamics. El maestro de tareas comerciales permanece fail-closed."
      />
      <ActiveFilterChips chips={chips} onRemove={(id) => setChips(chips.filter((chip) => chip.id !== id))} onClear={() => setChips([])} />
      {view === "kanban" && (
        <TaskBoard
          tasks={rows}
          onSelect={(task) => openFlow({ type: "edit-task", title: "Editar tarea", recordId: task.id })}
        />
      )}
      {view === "lista" && (
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DataTable
            data={rows}
            columns={columns}
            onRowClick={(task) => openFlow({ type: "edit-task", title: "Editar tarea", recordId: task.id })}
          />
        </div>
      )}
      {view === "calendario" && (
        <div className="grid gap-2 md:grid-cols-3">
          {rows.map((task) => (
            <article key={task.id} className="glass-panel rounded-[22px] p-3">
              <p className="text-xs text-muted">{task.dueDate}</p>
              <p className="font-medium">{task.title}</p>
            </article>
          ))}
        </div>
      )}
      {(view === "mias" || view === "equipo") && (
        <ul className="grid gap-2">
          {rows.map((task) => (
            <li key={task.id} className="glass-panel rounded-[22px] px-4 py-3">
              <p className="font-medium">{task.title}</p>
              <p className="text-xs text-muted">{task.owners.join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
      {view === "carga" && (
        <ul className="grid gap-2 md:grid-cols-3">
          {load.map((item) => (
            <li key={item.name} className="glass-panel rounded-[22px] p-4">
              <p className="font-semibold">{item.name}</p>
              <p className="text-2xl">{item.count}</p>
              <p className="text-xs text-muted">tareas abiertas</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
