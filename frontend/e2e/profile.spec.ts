import { test, expect } from "@playwright/test";

test("acceso, perfil, validación, persistencia y cierre de sesión", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Administrador", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Empresa", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Capacidades", exact: true }).click();
  await page.getByRole("button", { name: "Añadir registro" }).click();
  await page.getByRole("button", { name: "Guardar registro" }).click();
  await expect(page.getByLabel("Nombre de la capacidad")).toBeFocused();
  await page
    .getByLabel("Nombre de la capacidad")
    .fill("Consultoría de contratación");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Estructuración y revisión de proyectos tecnológicos");
  await page.getByLabel("Vigente hasta").fill("2030-12-31");
  await page.getByRole("button", { name: "Guardar registro" }).click();
  await expect(
    page.getByRole("heading", { name: "Consultoría de contratación" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Consultoría de contratación" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acceder a TenderOps" }),
  ).toBeVisible();
});

test("el financiero puede crear borradores y el aprobador autoriza", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Financiero", exact: true }).click();
  await page.getByRole("link", { name: "Finanzas", exact: true }).click();
  await page.getByRole("button", { name: "Añadir registro" }).click();
  for (const [label, value] of [
    ["Inicio del periodo", "2025-01-01"],
    ["Cierre del periodo", "2025-12-31"],
    ["Vigente hasta", "2030-12-31"],
    ["Activos totales", "1000000.1234"],
    ["Pasivos totales", "100"],
    ["Activos corrientes", "500000"],
    ["Pasivos corrientes", "0"],
    ["Ingresos", "150000"],
    ["Fuente de las cifras", "Balance firmado de prueba"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Guardar registro" }).click();
  await expect(page.getByText("Versión 1 · Borrador")).toBeVisible();
  expect(
    await page.getByRole("button", { name: "Aprobar corte" }).count(),
  ).toBe(0);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const approver = await context.newPage();
  await approver.goto("https://localhost:7043/");
  await approver
    .getByRole("button", { name: "Aprobador", exact: true })
    .click();
  await approver.getByRole("link", { name: "Finanzas", exact: true }).click();
  await approver.getByRole("button", { name: "Aprobar corte" }).click();
  await expect(approver.getByText("Versión 2 · Aprobado")).toBeVisible();
  await context.close();
});

test("vista estrecha conserva navegación y formulario", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/");
  await page.getByRole("button", { name: "Analista", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir navegación", exact: true })
    .click();
  await page.getByRole("link", { name: "Capacidades", exact: true }).click();
  await page.getByRole("button", { name: "Añadir registro" }).click();
  await expect(page.getByLabel("Nombre de la capacidad")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
