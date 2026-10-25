# Credenciales pendientes

Ningún secreto de ejemplo es utilizable en producción. El código de cada conector ya existe; al entregar estas variables se activa por configuración.

## Obligatorias para Microsoft

- `AZURE_TENANT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET` **o** `ENTRA_CERTIFICATE_REFERENCE`
- `ENTRA_API_AUDIENCE` (validación JWT de la API)
- `DYNAMICS_BASE_URL`
- `DATAVERSE_URL`
- `SHAREPOINT_SITE_ID` y `SHAREPOINT_DRIVE_ID` (se pueden resolver en runtime si el sitio es accesible)
- `COPILOT_CONNECTION_STRING` y los `COPILOT_*_AGENT_ID`

## Recomendadas para SECOP a escala

- `SOCRATA_APP_TOKEN` (solo `.env.local` o variables de Vercel; nunca en git)
- `CRON_SECRET` para proteger `GET|POST /api/v1/secop/sync`
- `DATABASE_URL` (PostgreSQL / Supabase)
- `AZURE_SERVICE_BUS_CONNECTION_STRING`

## No bloquean SECOP público

La búsqueda en vivo usa `https://www.datos.gov.co/resource/{dataset}.json`. El token reduce cupos y debe configurarse fuera del repositorio.
