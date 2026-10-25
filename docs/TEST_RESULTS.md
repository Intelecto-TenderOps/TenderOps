# Resultados de pruebas

## Backend TypeScript (`packages/backend`)

- `tsc --noEmit`: OK
- Vitest: 13 pruebas (normalización, SoQL, evaluación, matriz, permisos, API)
- `secop:sample`: consulta real a datos.gov.co (ver `SECOP_TEST_RESULTS.md`)

## Frontend

- `tsc --noEmit`: OK
- Vitest: 4 pruebas
- ESLint: 0 errores (1 warning preexistente de TanStack Table)

## No ejecutado en esta entrega

- Pruebas de Dynamics/Dataverse/Graph/Copilot con credenciales reales
- Carga de 100.000 filas en PostgreSQL
- `az bicep` no se modificó de forma incompatible; el job de infra existente sigue usando `infra/main.bicep`
