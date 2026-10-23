import { test, expect } from "@playwright/test";

test("filtros laterales y etiquetas removibles en todos los módulos", async ({
  page,
}) => {
  const cases = [
    {
      path: "opportunities/demo-a-op-1/requirements",
      label: "Categoría",
      value: "Financiero",
      chip: "Categoría: Financiero",
    },
    {
      path: "opportunities/demo-a-op-1/preparation",
      label: "Estado del entregable",
      value: "Pendiente",
      chip: "Estado: Pendiente",
    },
    {
      path: "tasks",
      label: "Responsable",
      value: "Mariana Torres",
      chip: "Responsable: Mariana Torres",
    },
    {
      path: "company-documents",
      label: "Tipo de soporte",
      value: "Jurídico",
      chip: "Tipo: Jurídico",
    },
    {
      path: "operations",
      label: "Estado del trabajo",
      value: "Fallido",
      chip: "Estado: Fallido",
    },
    {
      path: "alerts",
      label: "Mostrar alertas",
      value: "Sin leer",
      chip: "Alertas: Sin leer",
    },
    {
      path: "analytics",
      label: "Fuente",
      value: "SECOP II",
      chip: "Fuente: SECOP II",
    },
  ];
  for (const item of cases) {
    await page.goto(`/demo/${item.path}`);
    await page.getByRole("button", { name: /^Filtros/ }).click();
    const drawer = page.getByRole("dialog", { name: "Filtros de búsqueda" });
    await expect(drawer).toBeVisible();
    await page
      .getByRole("combobox", { name: item.label, exact: true })
      .selectOption(item.value);
    await page
      .getByRole("button", { name: "Ver resultados", exact: true })
      .click();
    const chip = page.getByRole("button", {
      name: `Quitar filtro ${item.chip}`,
      exact: true,
    });
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(chip).toHaveCount(0);
  }
  await page.goto("/demo/audit");
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await page
    .getByLabel("Buscar acción, actor o correlación")
    .fill("Candidatura");
  await page
    .getByRole("button", { name: "Ver resultados", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Quitar filtro Búsqueda: Candidatura" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Limpiar todos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /^Quitar filtro/ }),
  ).toHaveCount(0);
});

test("filtros de oportunidades conservan URL, etiquetas, foco y reflujo móvil", async ({
  page,
}) => {
  await page.goto("/demo/opportunities");
  const trigger = page.getByRole("button", { name: /^Filtros/ });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("combobox", { name: "Ubicación", exact: true })
    .selectOption("Antioquia");
  await page
    .getByRole("combobox", { name: "Fuente", exact: true })
    .selectOption("SECOP II");
  await page
    .getByRole("button", { name: "Buscar procesos", exact: true })
    .click();
  await expect(page).toHaveURL(/region=Antioquia/);
  await expect(trigger).toBeFocused();
  await page
    .getByRole("button", {
      name: "Quitar filtro Ubicación: Antioquia",
      exact: true,
    })
    .click();
  await expect(page).not.toHaveURL(/region=/);
  await expect(
    page.getByRole("button", {
      name: "Quitar filtro Fuente: SECOP II",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workbench/glass-blue-tags.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 850 });
  await trigger.click();
  await page.screenshot({
    path: "test-results/workbench/glass-blue-drawer-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page
    .getByRole("button", { name: "Limpiar todos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /^Quitar filtro/ }),
  ).toHaveCount(0);
});

test("navegación integral, capturas y separación de empresas sin backend", async ({
  page,
}) => {
  const errors: string[] = [];
  const api: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api"))
      api.push(request.url());
  });
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Elige dónde concentrar tu equipo" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workbench/overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Oportunidades", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Encuentra la próxima oportunidad" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Comparar DEMO-2026-041" }).check();
  await page.getByRole("checkbox", { name: "Comparar DEMO-2026-042" }).check();
  await page.getByRole("link", { name: "Comparar (2/10)" }).click();
  await expect(
    page.getByRole("table", {
      name: "Comparación de oportunidades seleccionadas",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Oportunidades", exact: true }).click();
  await page
    .getByRole("link", {
      name: "Modernización de la plataforma de atención ciudadana",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Modernización de la plataforma de atención ciudadana",
      exact: true,
    }),
  ).toBeVisible();
  for (const tab of [
    "Documentos",
    "Requisitos",
    "Evaluación",
    "Decisión",
    "Preparación",
    "Historial",
  ]) {
    await page
      .getByRole("link", { name: new RegExp("^" + tab + "(?:\\s*\\d+)?$") })
      .click();
    await expect(page.locator("main")).not.toContainText(
      "No encontramos esta página",
    );
  }
  await page.getByRole("link", { name: /^Requisitos/ }).click();
  await expect(
    page.getByRole("heading", { name: "Matriz de cumplimiento", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workbench/requirements-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("EMPRESA ACTIVA").selectOption("demo-company-2");
  await expect(
    page.getByRole("heading", {
      name: "Expediente no disponible en esta empresa",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Oportunidades", exact: true }).click();
  await expect(
    page.getByText(
      "Proyecto regional · Modernización de la plataforma de atención ciudadana",
    ),
  ).toBeVisible();
  for (const route of [
    "saved-searches",
    "alerts",
    "sources",
    "tasks",
    "company-documents",
    "dynamics",
    "analytics",
    "operations",
    "audit",
    "settings",
    "profile/company",
    "profile/capability",
    "profile/experience",
    "profile/evidence",
    "profile/coverage",
    "profile/rule",
    "profile/membership",
    "profile/team",
    "profile/sourcepolicy",
  ]) {
    await page.goto("/demo/" + route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(
      "No encontramos esta página",
    );
  }
  expect(errors).toEqual([]);
  expect(api).toEqual([]);
});

test("búsqueda con acentos, guardado, vacío y filtros inválidos", async ({
  page,
}) => {
  await page.goto("/demo/opportunities");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar por objeto, entidad o número" })
    .fill("gestion documental");
  await page.getByRole("button", { name: "Buscar procesos" }).click();
  await expect(
    page.getByRole("link", {
      name: "Implementación de un sistema de gestión documental",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Guardar búsqueda", exact: true })
    .click();
  await page
    .getByLabel("Nombre de la búsqueda", { exact: true })
    .fill("Documental prioritaria");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("link", { name: "Búsquedas guardadas", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Documental prioritaria", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Oportunidades", exact: true }).click();
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar por objeto, entidad o número" })
    .fill("zzzinexistente");
  await page.getByRole("button", { name: "Buscar procesos" }).click();
  await expect(
    page.getByRole("heading", { name: "No hay resultados para estos filtros" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await page.getByLabel("Valor mínimo (COP)").fill("100");
  await page.getByLabel("Valor máximo (COP)").fill("10");
  await page.getByRole("button", { name: "Buscar procesos" }).click();
  await expect(page.getByRole("alert")).toContainText("mínimo");
});

test("comentarios seguros, adenda, revisión y decisión con permiso por función", async ({
  page,
}) => {
  await page.goto("/demo/opportunities/demo-a-op-1");
  await page
    .getByRole("button", { name: "Añadir comentario", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Comentario", exact: true })
    .fill("<img src=x onerror=alert(1)> Nota del equipo");
  await page
    .getByRole("button", { name: "Publicar comentario en la demo" })
    .click();
  await expect(
    page.getByText("<img src=x onerror=alert(1)> Nota del equipo", {
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.locator(".comment-list img").count()).toBe(0);
  await page.getByRole("link", { name: /^Documentos/ }).click();
  await page.getByRole("button", { name: "Simular adenda" }).click();
  await page.getByLabel("Confirmo que deseo simular el cambio").check();
  await page.getByRole("button", { name: "Crear versión de prueba" }).click();
  await expect(
    page.getByText("Análisis desactualizado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Anexo pendiente de inspección" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Archivo restringido" }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Descargar texto de ejemplo" })
      .count(),
  ).toBe(0);
  await page.getByRole("link", { name: "Decisión", exact: true }).click();
  expect(
    await page
      .getByRole("button", { name: "Registrar decisión", exact: true })
      .count(),
  ).toBe(0);
  await page.getByLabel("Vista de función").selectOption("Approver");
  await page
    .getByRole("button", { name: "Registrar decisión", exact: true })
    .click();
  await page
    .getByLabel("Motivo documentado")
    .fill("La evidencia disponible no permite participar en este proceso.");
  await page
    .getByRole("button", { name: "Registrar decisión en la demo" })
    .click();
  await expect(
    page.getByRole("heading", { name: "NO_BID", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Historial", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "decision.record", exact: true }),
  ).toBeVisible();
});

test("formularios, trabajo asíncrono, preferencias y permisos negativos", async ({
  page,
}) => {
  await page.goto("/demo/sources");
  await page
    .getByRole("button", { name: "Configurar", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Versión de términos revisada")
    .fill("Términos de prueba v1");
  await page.getByLabel("Uso autorizado para la simulación").check();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simular lote", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Operación", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Trabajos y reintentos" })
      .getByText("Completado", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("link", { name: "Configuración", exact: true }).click();
  await page.getByRole("button", { name: "Editar preferencias" }).click();
  await page.getByLabel("Preferencia de correo", { exact: true }).check();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambio guardado");
  await page.getByRole("link", { name: "Indicadores", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar propuesta", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Objetivo", { exact: true })
    .fill("Menos de 60 minutos");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByText("Menos de 60 minutos", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Vista de función").selectOption("Auditor");
  await page.getByRole("link", { name: "Fuentes", exact: true }).click();
  expect(
    await page.getByRole("button", { name: "Configurar", exact: true }).count(),
  ).toBe(0);
});

test("reflujo, teclado, foco de diálogo y siete funciones", async ({
  page,
}) => {
  await page.goto("/demo/opportunities");
  await page
    .getByRole("button", { name: "Guardar búsqueda", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar búsqueda", exact: true }),
  ).toBeFocused();
  for (const role of [
    "Analyst",
    "Commercial",
    "Legal",
    "Financial",
    "Approver",
    "Auditor",
    "Administrator",
  ]) {
    await page.getByLabel("Vista de función").selectOption(role);
    await expect(page.locator("main h1")).toBeVisible();
  }
  for (const route of [
    "overview",
    "opportunities",
    "opportunities/demo-a-op-1/documents",
    "opportunities/demo-a-op-1/decision",
    "tasks",
    "analytics",
    "profile/capability",
  ]) {
    await page.goto("/demo/" + route);
    await page.setViewportSize({ width: 320, height: 850 });
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/workbench/mobile-profile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/demo/overview");
  await page.evaluate(() => {
    document.body.style.zoom = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
