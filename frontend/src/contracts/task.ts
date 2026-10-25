export type TaskStatus = "pendiente" | "en_curso" | "bloqueada" | "hecha";
export type TaskPriority = "baja" | "media" | "alta" | "urgente";

export interface WorkTask {
  id: string;
  tenderId: string | null;
  title: string;
  description: string;
  owners: string[];
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueDate: string;
  evidence: string | null;
  dynamicsTaskId: string | null;
}
