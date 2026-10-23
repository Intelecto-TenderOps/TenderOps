import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/DataTable";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { Button } from "@/components/ui/button";
import { ActiveFilterChips } from "@/components/selection";
import { StatusBadge } from "@/components/viz/StatusBadge";
import type { WorkTask } from "@/contracts";
import { useFilterChips } from "@/hooks/useFilterChips";
import { people } from "@/mocks/catalogs";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

const columns: ColumnDef<WorkTask>[] = [
  { accessorKey: "title", header: "Tarea" },
  { accessorKey: "owners", header: "Responsables", cell: ({ getValue }) => (getValue() as string[]).join(", ") },
  { accessorKey: "priority", header: "Prioridad", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
  { accessorKey: "status", header: "Estado", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
  { accessorKey: "dueDate", header: "Fecha" },
];

export function TareasPage() {
  const { chips, setChips } = useFilterChips();
  const tasks = useDemoStore((state) => state.workspace.tasks);
  const openFlow = useDrawerStore((state) => state.openFlow);
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
    <section className="grid gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Tareas y equipo</p>
          <h1 className="text-3xl font-semibold">Trabajo en curso</h1>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </header>
      <ActiveFilterChips chips={chips} onRemove={(id) => setChips(chips.filter((chip) => chip.id !== id))} onClear={() => setChips([])} />
      {view === "kanban" && (
        <TaskBoard
          tasks={rows}
          onSelect={(task) => openFlow({ type: "edit-task", title: "Editar tarea", recordId: task.id })}
        />
      )}
      {view === "lista" && (
        <div className="table-surface overflow-hidden rounded-[24px]">
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
