import { expect, test } from "@playwright/test";

test("revisión visual, menú derecho y teclado", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/panorama");
  await expect(page.getByRole("heading", { name: /día de la mesa/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual/desktop-panorama.png", fullPage: true });
  await page.getByRole("link", { name: "Exploración" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Licitaciones SECOP" })).toBeVisible();
  await page.getByRole("button", { name: "Filtros" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "test-results/visual/desktop-drawer.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 850 });
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "test-results/visual/mobile-explorar.png", fullPage: true });
  expect(errors).toEqual([]);
});
