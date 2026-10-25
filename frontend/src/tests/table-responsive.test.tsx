import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AccessibilityDock } from "@/components/a11y/AccessibilityDock";
import { DataTable, RichHtmlTable } from "@/components/data/DataTable";

afterEach(() => {
  cleanup();
});

describe("AccessibilityDock", () => {
  it("está cerrado por defecto", () => {
    render(<AccessibilityDock />);
    const toggle = screen.getByRole("button", { name: "Abrir accesibilidad" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Accesibilidad")).not.toBeInTheDocument();
    expect(screen.queryByText("Restablecer demo")).not.toBeInTheDocument();
  });

  it("abre el panel al pulsar el botón", async () => {
    const user = userEvent.setup();
    const view = render(<AccessibilityDock />);
    await user.click(within(view.container).getByRole("button", { name: "Abrir accesibilidad" }));
    expect(within(view.container).getByText("Accesibilidad")).toBeInTheDocument();
    expect(within(view.container).getByRole("button", { name: "Cerrar accesibilidad" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});

describe("DataTable", () => {
  const rows = [
    { id: "1", name: "Alpha", amount: "120" },
    { id: "2", name: "Beta", amount: "80" },
  ];
  const columns = [
    {
      id: "name",
      header: "Nombre",
      grow: true,
      sortValue: (row: (typeof rows)[number]) => row.name,
      cell: (row: (typeof rows)[number]) => row.name,
    },
    {
      id: "amount",
      header: "Valor",
      align: "right" as const,
      sortValue: (row: (typeof rows)[number]) => row.amount,
      cell: (row: (typeof rows)[number]) => row.amount,
    },
  ];

  it("expone etiquetas de columna para el layout apilado", () => {
    const { container } = render(<DataTable data={rows} columns={columns} />);
    expect(screen.getByRole("columnheader", { name: /Nombre/ })).toBeInTheDocument();
    expect(container.querySelector('[data-label="Valor"]')).toBeTruthy();
    expect(container.querySelector('[data-label="Nombre"]')).toBeTruthy();
  });

  it("mantiene paginación y registros visibles", () => {
    const view = render(<DataTable data={rows} columns={columns} />);
    expect(within(view.container).getByText(/2 registros/)).toBeInTheDocument();
    expect(within(view.container).getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(within(view.container).getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });
});

describe("RichHtmlTable", () => {
  it("etiqueta celdas secundarias para el apilado móvil", () => {
    const { container } = render(
      <RichHtmlTable headers={["Atributo", "Valor"]} rows={[["Objeto", "Obra civil"]]} />,
    );
    expect(container.querySelector('[data-label="Valor"]')).toBeTruthy();
    expect(screen.getByText("Obra civil")).toBeInTheDocument();
  });
});
