export function FunnelBars({
  items,
}: {
  items: { stage: string; count: number }[];
}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.stage} className="grid gap-1">
          <div className="flex justify-between text-xs text-muted">
            <span>{item.stage}</span>
            <span>{item.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-electric"
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BarList({
  items,
  formatValue,
}: {
  items: { name: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.name} className="grid gap-1">
          <div className="flex justify-between gap-3 text-xs">
            <span className="truncate">{item.name}</span>
            <span className="text-muted">{formatValue ? formatValue(item.value) : item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-bright"
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
