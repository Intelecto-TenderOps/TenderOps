export interface DateRange {
  start: string;
  end: string | null;
}

function parseMonth(value: string): number {
  const key = value.slice(0, 7);
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return Number.NaN;
  return year * 12 + (month - 1);
}

export function monthsBetween(start: string, end: string): number {
  const from = parseMonth(start);
  const to = parseMonth(end);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return to - from + 1;
}

export function mergeRanges(ranges: DateRange[], today: string): { months: number; periods: { start: string; end: string }[] } {
  const normalized = ranges
    .map((range) => {
      const start = range.start.slice(0, 10);
      const end = (range.end ?? today).slice(0, 10);
      return { start, end, from: parseMonth(start), to: parseMonth(end) };
    })
    .filter((range) => Number.isFinite(range.from) && Number.isFinite(range.to) && range.to >= range.from)
    .sort((left, right) => left.from - right.from);

  const merged: { start: string; end: string; from: number; to: number }[] = [];
  for (const range of normalized) {
    const last = merged[merged.length - 1];
    if (!last || range.from > last.to + 1) {
      merged.push({ start: range.start, end: range.end, from: range.from, to: range.to });
      continue;
    }
    if (range.to > last.to) {
      last.to = range.to;
      last.end = range.end;
    }
  }

  return {
    months: merged.reduce((sum, item) => sum + (item.to - item.from + 1), 0),
    periods: merged.map((item) => ({ start: item.start, end: item.end })),
  };
}
