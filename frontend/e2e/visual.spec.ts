import { test, expect } from '@playwright/test';

test('revisión visual y navegación con teclado', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Administrador', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Empresa', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/visual/desktop-company.png', fullPage: true });
  await page.getByRole('link', { name: 'Capacidades', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Añadir registro' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('form', { name: 'Añadir registro' })).toBeVisible();
  await page.screenshot({ path: 'test-results/visual/desktop-form.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 850 });
  await page.screenshot({ path: 'test-results/visual/mobile-form.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.evaluate(() => { document.body.style.zoom = '200%'; });
  const zoomLayout = await page.evaluate(() => ({
    width: window.innerWidth, contentWidth: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > window.innerWidth + 1).map(element => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right })),
  }));
  expect(zoomLayout.contentWidth, JSON.stringify(zoomLayout)).toBeLessThanOrEqual(zoomLayout.width);
  expect(errors).toEqual([]);
});
