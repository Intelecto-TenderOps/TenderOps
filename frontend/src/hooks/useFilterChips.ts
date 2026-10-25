import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { FilterChip } from "@/contracts";

export function useFilterChips() {
  const [params, setParams] = useSearchParams();
  const chips = useMemo<FilterChip[]>(() => {
    return [...params.entries()]
      .filter(([key]) => key.startsWith("f_"))
      .map(([key, value]) => {
        const field = key.slice(2);
        return {
          id: `${field}:${value}`,
          field,
          label: labelFor(field),
          value,
        };
      });
  }, [params]);

  function setChips(next: FilterChip[]) {
    const copy = new URLSearchParams(params);
    [...copy.keys()].filter((key) => key.startsWith("f_")).forEach((key) => copy.delete(key));
    next.forEach((chip) => copy.append(`f_${chip.field}`, chip.value));
    setParams(copy, { replace: true });
  }

  return { chips, setChips };
}

function labelFor(field: string): string {
  const labels: Record<string, string> = {
    modality: "Modalidad",
    department: "Departamento",
    status: "Estado",
    value: "Valor",
    owner: "Responsable",
    category: "Categoría",
    source: "Fuente",
    kind: "Tipo",
    priority: "Prioridad",
  };
  return labels[field] ?? field;
}
