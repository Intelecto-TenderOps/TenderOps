import { cn } from "@/lib/cn";

export function FlowStepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  if (!steps.length) return null;
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Pasos del flujo">
      {steps.map((step, index) => (
        <li
          key={step}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            index === current
              ? "bg-electric text-white"
              : index < current
                ? "bg-mist text-corporate"
                : "bg-white/50 text-muted",
          )}
        >
          {index + 1}. {step}
        </li>
      ))}
    </ol>
  );
}
