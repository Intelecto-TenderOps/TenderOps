import { expect, test } from "@playwright/test";

test("navegación derecha, filtros laterales y etiquetas removibles", async ({ page }) => {
  await page.goto("/explorar");
  await expect(page.getByRole("heading", { name: "Licitaciones SECOP" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  await page.getByRole("button", { name: "Filtros" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Modalidad").selectOption("Licitación pública");
  await page.getByLabel("Departamento").selectOption("Valle del Cauca");
  await page.getByLabel("Estado").selectOption("abierto");
  await page.getByLabel("Valor").selectOption("Más de $100 millones");
  await page.getByRole("button", { name: "Ver resultados" }).click();
  const chip = page.getByRole("button", { name: "Quitar Departamento: Valle del Cauca" });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(chip).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Quitar Modalidad: Licitación pública" })).toBeVisible();
});

test("flujo lateral de experiencia y asignación", async ({ page }) => {
  await page.goto("/empresa/experiencia");
  await page.getByRole("button", { name: "Registrar experiencia" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Objeto").fill("Soporte de plataforma ciudadana");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Cliente").fill("Instituto Distrital del Futuro");
  await page.getByLabel("Contrato").fill("IDF-2026-010");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Valor en COP").fill("450000000");
  await page.getByLabel("Inicio").fill("2025-01-01");
  await page.getByLabel("Fin").fill("2025-12-31");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Documento de soporte").fill("Acta de liquidación");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Soporte de plataforma ciudadana")).toBeVisible();
});

test("matriz de cumplimiento y recálculo", async ({ page }) => {
  await page.goto("/procesos/SECOP-LP-2026-041/matriz");
  await expect(page.getByRole("heading", { name: "Matriz de cumplimiento" })).toBeVisible();
  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect(page.getByText(/recálculo local #1/)).toBeVisible();
  await page.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Observaciones").fill("Revisado en demostración");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Revisado en demostración")).toBeVisible();
});

test("tareas, copilot y cambio de empresa", async ({ page }) => {
  await page.goto("/tareas");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByLabel("Título").fill("Revisar adenda");
  await page.getByLabel("Responsables").selectOption("Laura Méndez");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Revisar adenda")).toBeVisible();
  await page.goto("/copilot");
  await page.getByRole("button", { name: "Asignar revisión financiera" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Quitar Laura Méndez" }).click();
  await page.getByLabel("Responsables").selectOption("Camilo Vargas");
  await page.getByRole("button", { name: "Asignar" }).click();
  await page.getByLabel("Empresa activa").selectOption("Oriente Soluciones");
  await expect(page.getByLabel("Empresa activa")).toHaveValue("co-oriente");
});
