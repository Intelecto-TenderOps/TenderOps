import type { TaskStatus, WorkTask } from "@/contracts";
import { StatusBadge } from "@/components/viz/StatusBadge";

const columns: TaskStatus[] = ["pendiente", "en_curso", "bloqueada", "hecha"];

export function TaskBoard({
  tasks,
  onSelect,
}: {
  tasks: WorkTask[];
  onSelect: (task: WorkTask) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {columns.map((status) => (
        <section key={status} className="glass-panel rounded-[22px] p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {status.replace("_", " ")}
          </h3>
          <div className="grid gap-2">
            {tasks
              .filter((task) => task.status === status)
              .map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelect(task)}
                  className="rounded-2xl bg-white/80 p-3 text-left"
                >
                  <p className="text-sm font-semibold">{task.title}</p>
                  <p className="text-xs text-muted">{task.owners.join(", ")}</p>
                  <div className="mt-2">
                    <StatusBadge value={task.priority} />
                  </div>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
