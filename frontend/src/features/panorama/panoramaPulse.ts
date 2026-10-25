import type { AlertItem, CommercialOpportunity, Membership, Tender, WorkTask } from "@/contracts";

const PRIORITY_RANK: Record<WorkTask["priority"], number> = {
  urgente: 4,
  alta: 3,
  media: 2,
  baja: 1,
};

export interface PanoramaSource {
  tenders: Tender[];
  tasks: WorkTask[];
  memberships: Membership[];
  alerts: AlertItem[];
  opportunities: CommercialOpportunity[];
}

export interface ActorPulse {
  id: string;
  name: string;
  role: string;
  team: string;
  initials: string;
  openTasks: number;
  overdueTasks: number;
  processes: number;
  nextTask?: WorkTask;
}

export function bogotaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function bogotaLongDate(now = new Date()): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(now);
}

export function dateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function daysFromToday(value: string, today = bogotaToday()): number {
  const start = Date.parse(`${today}T12:00:00-05:00`);
  const end = Date.parse(`${dateKey(value)}T12:00:00-05:00`);
  return Math.round((end - start) / 86_400_000);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function buildPanoramaPulse(source: PanoramaSource, today = bogotaToday()) {
  const liveTenders = source.tenders.filter(
    (item) => item.status === "abierto" || item.status === "en_evaluacion",
  );
  const closingSoon = [...liveTenders]
    .sort((left, right) => daysFromToday(left.closesAt, today) - daysFromToday(right.closesAt, today))
    .slice(0, 6);
  const recommended = liveTenders.filter((item) => item.recommendation === "BID");
  const openTasks = source.tasks.filter((item) => item.status !== "hecha");
  const overdueTasks = openTasks
    .filter((item) => dateKey(item.dueDate) < today)
    .sort(compareTasks);
  const focusTasks = [...openTasks].sort(compareTasks).slice(0, 6);
  const actors: ActorPulse[] = source.memberships
    .filter((member) => member.active)
    .map((member) => {
      const assigned = openTasks.filter((task) => task.owners.includes(member.name));
      const owned = source.tenders.filter((tender) => tender.owner === member.name);
      return {
        id: member.id,
        name: member.name,
        role: member.role,
        team: member.team,
        initials: initials(member.name),
        openTasks: assigned.length,
        overdueTasks: assigned.filter((task) => dateKey(task.dueDate) < today).length,
        processes: owned.length,
        nextTask: [...assigned].sort(compareTasks)[0],
      };
    })
    .sort((left, right) => right.openTasks - left.openTasks || right.overdueTasks - left.overdueTasks);
  const loadedActors = actors.filter((actor) => actor.openTasks > 0 || actor.processes > 0);
  const alerts = source.alerts.filter((item) => !item.silenced && !item.read).slice(0, 4);
  const pipelineValue = recommended.reduce((sum, item) => sum + item.value, 0);

  return {
    today,
    liveTenders,
    closingSoon,
    recommended,
    openTasks,
    overdueTasks,
    focusTasks,
    actors,
    loadedActors,
    alerts,
    pipelineValue,
    inDynamics: source.opportunities.length,
  };
}

function compareTasks(left: WorkTask, right: WorkTask) {
  const due = dateKey(left.dueDate).localeCompare(dateKey(right.dueDate));
  if (due !== 0) return due;
  return PRIORITY_RANK[right.priority] - PRIORITY_RANK[left.priority];
}
