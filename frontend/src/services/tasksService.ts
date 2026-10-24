import type { WorkTask } from "@/contracts";
import { createId } from "@/lib/ids";
import { apiPost, isIntegrationUnconfigured, readIntegrationError } from "./http";
import { readWorkspace, writeWorkspace } from "./workspace";

export const tasksService = {
  async list() {
    return { items: readWorkspace().tasks, source: "local" as const };
  },
  async save(task: Omit<WorkTask, "id"> & { id?: string }) {
    const record: WorkTask = {
      ...task,
      id: task.id ?? createId("tsk"),
      dynamicsTaskId: task.dynamicsTaskId ?? null,
    };
    let dynamics: { ok: boolean; message?: string } = { ok: false };
    try {
      await apiPost("/api/v1/tasks", { title: record.title, dueDate: record.dueDate });
      dynamics = { ok: true };
    } catch (error) {
      const info = readIntegrationError(error);
      dynamics = {
        ok: false,
        message: isIntegrationUnconfigured(error)
          ? "Dynamics 365 no está configurado. La tarea queda solo en el espacio local."
          : info.message,
      };
      record.dynamicsTaskId = null;
    }
    writeWorkspace((workspace) => ({
      ...workspace,
      tasks: workspace.tasks.some((item) => item.id === record.id)
        ? workspace.tasks.map((item) => (item.id === record.id ? record : item))
        : [record, ...workspace.tasks],
    }));
    return { item: record, dynamics };
  },
  async remove(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      tasks: workspace.tasks.filter((item) => item.id !== id),
    }));
    return { ok: true as const };
  },
};
