# Contratos API v1

Base: `{AZURE_FUNCTIONS_BASE_URL}/api/v1` o `/api/v1` detrás de un rewrite.

Autenticación: `Authorization: Bearer` (Entra o token demo local). Empresa activa: `X-Company-Id` en rutas de workbench.

## Perfil (compatibles con el BFF del incremento 1)

| Método | Ruta |
| --- | --- |
| POST | `/companies` |
| POST | `/companies/{id}/select` |
| GET/POST | `/companies/{id}/{kind}` |
| GET/PUT | `/companies/{id}/{kind}/{id}` |
| POST | `/companies/{id}/{kind}/{id}/approve` |
| GET | `/companies/{id}/financial/eligible` |
| GET | `/companies/{id}/audit` |
| GET | `/companies/{id}/workspace` |

`kind`: company, capability, experience, evidence, financial, coverage, rule, membership, team, sourcepolicy, job.

Mutaciones de perfil: `Idempotency-Key` UUID. Actualizaciones: `If-Match`.

## Dominio TenderOps

| Método | Ruta |
| --- | --- |
| GET | `/secop/processes` |
| GET | `/secop/processes/{id}` |
| POST | `/secop/processes/{id}/favorite` |
| POST | `/secop/processes/{id}/watch` |
| POST | `/secop/searches` |
| GET | `/assessments` |
| GET | `/requirements` |
| PATCH | `/requirements/{id}` |
| GET/POST | `/decisions` |
| GET/POST | `/opportunities` |
| GET/POST | `/tasks` |
| GET | `/documents` |
| GET | `/copilot/agents` |
| POST | `/copilot/ask` |
| GET | `/analytics/overview` |
| GET | `/notifications` |
| GET | `/administration/integrations` |

OpenAPI local: `GET /api/v1/openapi.json`.

Los cuerpos coinciden con `frontend/src/contracts/*`. No se cambiaron nombres de campos del frontend.
