import { describe, expect, it } from "vitest";
import type { FilterChip } from "@/contracts";
import { chipsToFilters, filterTenders } from "@/services/tendersService";
import { createSeed } from "@/mocks/seed";

describe("sistema de filtros", () => {
  it("convierte etiquetas en filtros y actualiza el conjunto", () => {
    const chips: FilterChip[] = [
      { id: "1", field: "modality", label: "Modalidad", value: "Licitación pública" },
      { id: "2", field: "department", label: "Departamento", value: "Valle del Cauca" },
      { id: "3", field: "status", label: "Estado", value: "abierto" },
      { id: "4", field: "value", label: "Valor", value: "Más de $100 millones" },
    ];
    const filters = chipsToFilters(chips);
    const rows = filterTenders(createSeed().tenders, filters);
    expect(filters.modalities).toEqual(["Licitación pública"]);
    expect(filters.departments).toEqual(["Valle del Cauca"]);
    expect(rows.every((item) => item.modality === "Licitación pública")).toBe(true);
    const withoutDepartment = chipsToFilters(chips.filter((chip) => chip.field !== "department"));
    const next = filterTenders(createSeed().tenders, withoutDepartment);
    expect(next.length).toBeGreaterThanOrEqual(rows.length);
  });
});
