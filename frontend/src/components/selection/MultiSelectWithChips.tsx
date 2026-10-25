import { SelectionChips } from "./SelectionChip";

export interface SelectOption {
  value: string;
  label: string;
}

export function MultiSelectWithChips({
  id,
  label,
  options,
  values,
  onChange,
}: {
  id: string;
  label: string;
  options: SelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      <select
        id={id}
        className="h-10 rounded-2xl border border-[var(--to-line)] bg-white/90 px-3 text-sm"
        value=""
        onChange={(event) => {
          const value = event.target.value;
          if (value && !values.includes(value)) onChange([...values, value]);
        }}
      >
        <option value="">Añadir {label.toLowerCase()}</option>
        {options
          .filter((option) => !values.includes(option.value))
          .map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
      <SelectionChips
        items={values.map((value) => ({
          id: value,
          label: options.find((option) => option.value === value)?.label ?? value,
        }))}
        onRemove={(id) => onChange(values.filter((value) => value !== id))}
      />
    </div>
  );
}
