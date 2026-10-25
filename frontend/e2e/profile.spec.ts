import { expect, test } from "@playwright/test";

test("perfil empresarial, validación y persistencia local", async ({ page }) => {
  await page.goto("/empresa/capacidades");
  await expect(page.getByRole("heading", { name: /Andina Tecnología/ })).toBeVisible();
  await page.getByRole("button", { name: "Añadir registro" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Indica el nombre de la capacidad")).toBeVisible();
  await page.getByLabel("Nombre de la capacidad").fill("Consultoría de contratación");
  await page.getByLabel("Descripción").fill("Estructuración y revisión de proyectos tecnológicos");
  await page.getByLabel("Vigente hasta").fill("2030-12-31");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Consultoría de contratación")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Consultoría de contratación")).toBeVisible();
});
