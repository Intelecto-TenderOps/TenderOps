const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("es-CO", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

const dateOnly = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeZone: "America/Bogota",
});

const longDate = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

const labels: Record<string, string> = {
  abierto: "Apertura",
  en_evaluacion: "Evaluación",
  adjudicado: "Adjudicación",
  desierto: "Desierto",
  cerrado: "Cierre",
  en_revision: "Revisión",
  en_curso: "En curso",
  bloqueada: "Bloqueada",
  hecha: "Hecha",
  pendiente: "Pendiente",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
  cumple: "Cumple",
  no_cumple: "No cumple",
  indeterminado: "Indeterminado",
  no_aplica: "No aplica",
  en_proceso: "En proceso",
  listo_no_cargado: "Listo, no cargado",
  cargado: "Cargado",
  abierta: "Abierta",
  cerrada: "Cerrada",
  calificacion: "Calificación",
  propuesta: "Propuesta",
  negociacion: "Negociación",
  ganada: "Ganada",
  perdida: "Perdida",
  vigente: "Vigente",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  disponible: "Disponible",
  cuarentena: "Cuarentena",
  critico: "Crítico",
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
  BID: "BID",
  NO_BID: "NO BID",
  REVISION: "Revisión",
};

export const BOGOTA_ZONE = "Bogotá UTC-5";

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatCop(value: number): string {
  return `COP ${value.toLocaleString("es-CO")}`;
}

export function formatCompact(value: number): string {
  return compact.format(value);
}

export function formatDateTime(value: string): string {
  return dateTime.format(new Date(value));
}

export function formatDate(value: string): string {
  return dateOnly.format(new Date(value));
}

export function formatLongDate(value: string): string {
  return longDate.format(new Date(value));
}

export function prettyLabel(value: string): string {
  return labels[value] ?? value.replaceAll("_", " ").replace(/^[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]/, (letter) => letter.toUpperCase());
}

export function daysUntil(value: string): number {
  const target = new Date(value).getTime();
  return Math.ceil((target - Date.now()) / 86_400_000);
}
