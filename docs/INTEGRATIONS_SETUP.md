# Activación de integraciones

1. Copiar `.env.example` y cargar las variables en Vercel (Production/Preview) y en Azure Function App.
2. SECOP: `SECOP_SEARCH_MODE=hybrid` consulta en vivo y fusiona el catálogo local. Poner `SOCRATA_APP_TOKEN` solo en `.env.local` o en Vercel. El poller local y el cron `GET /api/v1/secop/sync` mantienen la ventana reciente.
3. Índice: levantar PostgreSQL (`docker compose up -d`) y aplicar `packages/backend/src/db/schema.sql`. Definir `DATABASE_URL` y `SECOP_SEARCH_MODE=hybrid` o `indexed`.
4. Entra ID: registrar una aplicación con `client_credentials`, permisos Application para Dataverse y Graph, y admin consent.
5. Dynamics/Dataverse: URL de entorno + application user.
6. SharePoint: sitio `https://intelecto1.sharepoint.com/sites/intelectocrm`, biblioteca `Cuenta`. Guardar `siteId`/`driveId` tras la primera resolución.
7. Copilot Studio: publicar agentes y pegar IDs + cadena de conexión autorizada (Agents SDK o Direct Line).
8. Comprobar `GET /api/v1/admin/integrations`. No debe aparecer `available` en Microsoft hasta una prueba con credenciales reales.
