import type { WorkTask } from "@/contracts";
import { createId } from "@/lib/ids";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export const tasksService = {
  async list() {
    return simulateLatency(readWorkspace().tasks);
  },
  async save(task: Omit<WorkTask, "id"> & { id?: string }) {
    const record: WorkTask = {
      ...task,
      id: task.id ?? createId("tsk"),
    };
    writeWorkspace((workspace) => ({
      ...workspace,
      tasks: workspace.tasks.some((item) => item.id === record.id)
        ? workspace.tasks.map((item) => (item.id === record.id ? record : item))
        : [record, ...workspace.tasks],
    }));
    return simulateLatency(record);
  },
  async remove(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      tasks: workspace.tasks.filter((item) => item.id !== id),
    }));
    return simulateLatency(true);
  },
};
