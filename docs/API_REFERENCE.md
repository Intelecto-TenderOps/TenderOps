# Referencia API

Prefijo `/api/v1`.

Públicos (SECOP): `/secop/sources`, `/secop/processes`, `/secop/processes/{id}`, `/changes`, `/documents`, `/history`, `/search`, `/status`, `/catalog`, `/sync-history`.

Sincronización: `GET|POST /secop/sync` (si existe `CRON_SECRET`, exige Bearer o `x-cron-secret`).

Empresariales: `/companies`, `/assessments`, `/compliance/{processId}`, `/documents`, `/decisions`, `/opportunities`, `/crm/accounts`, `/tasks`, `/agents`, `/analytics/*`, `/admin/*`.

Contrato OpenAPI: `GET /api/v1/openapi.json`.
