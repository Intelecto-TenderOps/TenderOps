import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActiveFilterChips, MultiSelectWithChips } from "@/components/selection";

describe("etiquetas removibles", () => {
  it("elimina una etiqueta individual", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <ActiveFilterChips
        chips={[
          { id: "1", field: "department", label: "Departamento", value: "Valle del Cauca" },
          { id: "2", field: "status", label: "Estado", value: "Abierto" },
        ]}
        onRemove={onRemove}
        onClear={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Quitar Departamento: Valle del Cauca" }));
    expect(onRemove).toHaveBeenCalledWith("1");
  });

  it("mantiene selecciones múltiples al quitar una persona", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MultiSelectWithChips
        id="owners"
        label="Responsables"
        values={["Laura Méndez", "Daniel Rojas"]}
        onChange={onChange}
        options={[
          { value: "Laura Méndez", label: "Laura Méndez" },
          { value: "Daniel Rojas", label: "Daniel Rojas" },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Quitar Laura Méndez" }));
    expect(onChange).toHaveBeenCalledWith(["Daniel Rojas"]);
  });
});
