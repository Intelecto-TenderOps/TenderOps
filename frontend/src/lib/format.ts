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

export function formatCurrency(value: number): string {
  return currency.format(value);
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

export function daysUntil(value: string): number {
  const target = new Date(value).getTime();
  return Math.ceil((target - Date.now()) / 86_400_000);
}
