# TenderOps

Plataforma SaaS para descubrir, calificar y preparar contrataciones públicas en Colombia.

Esta entrega reconstruye el frontend empresarial (Liquid Glass, menú derecho y flujos laterales). El backend .NET permanece para la fase de integración y no es necesario para ejecutar la demostración.

## Cómo ejecutar el frontend

```bash
cd frontend
npm ci
npm run dev
```

Abre `http://127.0.0.1:5173`. La aplicación arranca en **modo demostración** con datos SECOP coherentes.

Scripts:

- `npm run dev` — entorno local
- `npm run build` — verificación TypeScript y empaquetado
- `npm test` — Vitest
- `npm run test:demo` — Playwright contra Vite
- `npm run lint` — ESLint

## Módulos

Panorama, Exploración, Calificación, Procesos (expediente, matriz, decisión, preparación), Documentos, Oportunidades Dynamics (simuladas), Tareas, Analítica, Copilot, Empresa y Administración.

Tres reglas de producto:

1. La navegación global flota a la derecha.
2. Toda operación se abre en un panel lateral (`FlowDrawer`).
3. Filtros y selecciones múltiples usan etiquetas removibles.

## Documentación

- `docs/FRONTEND_ARCHITECTURE.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/ROUTES_AND_MODULES.md`
- `docs/BACKEND_HANDOFF.md`
- `docs/FRONTEND_COVERAGE.md`
- `docs/INTERACTION_PATTERNS.md`

## Estado de pruebas

Las pruebas unitarias cubren filtros, matriz y etiquetas. Playwright cubre exploración, experiencia, matriz, tareas y Copilot. No hay conexión real a Azure Functions, Dynamics 365, Dataverse, SharePoint ni Copilot Studio.
