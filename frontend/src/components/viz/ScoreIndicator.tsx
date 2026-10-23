export function ScoreIndicator({ value }: { value: number }) {
  const tone = value >= 80 ? "text-emerald-700" : value >= 60 ? "text-amber-700" : "text-red-700";
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${tone}`}>
      <span className="h-2 w-10 overflow-hidden rounded-full bg-mist">
        <span className="block h-full bg-electric" style={{ width: `${value}%` }} />
      </span>
      {value}
    </span>
  );
}
