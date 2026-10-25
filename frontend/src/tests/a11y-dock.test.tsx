import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AccessibilityDock } from "@/components/a11y/AccessibilityDock";

describe("AccessibilityDock", () => {
  it("inicia cerrado y se abre al pulsar el botón", async () => {
    const user = userEvent.setup();
    render(<AccessibilityDock />);
    const toggle = screen.getByRole("button", { name: "Abrir accesibilidad" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Accesibilidad")).toBeNull();
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Cerrar accesibilidad" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Accesibilidad")).toBeInTheDocument();
  });
});
