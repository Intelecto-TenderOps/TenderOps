# Migración a Azure Functions + Dataverse

## Decisión

Vercel hospeda solo el frontend. Azure Functions (Node.js, modelo v4) ejecuta todo el backend. Microsoft Dataverse es la base de dominio. Dynamics 365 Sales es el CRM. SharePoint/Graph guarda documentos. Copilot Studio es la única plataforma de IA. SECOP (datos.gov.co) sigue siendo la fuente oficial de procesos.

## Inventario

| Componente | Destino |
| --- | --- |
| Frontend React/Vite (`frontend/`) | Conservar. Vercel. Sin cambio visual. Cliente HTTP centralizado. |
| Contratos `frontend/src/contracts/*` | Conservar. La API Azure los implementa. |
| Servicios demo `frontend/src/services/*` | Conservar para desarrollo. Llaman Azure cuando `VITE_API_BASE_URL` o `VITE_USE_AZURE_API` está activo. |
| `vercel.json` | Conservar publicación SPA. Sin Cron Jobs (no había). Sin rewrite a URL ficticia. |
| API C# `src/TenderOps.Api` y worker | Conservar como referencia del incremento 1 (BFF). Ya no es el backend operativo. |
| Infra Container Apps `infra/main.bicep` | Conservar. Superada por `infra/functions.bicep` para el backend nuevo. |
| Esquema `powerplatform/schema.json` (`tpo_`) | Conservar como propuesta previa. El prefijo aprobado es `tno_` en `schema-tno.json`. |
| PostgreSQL / Supabase | No existían dependencias activas. No hay datos que migrar desde esos sistemas. |
| Cron Jobs Vercel | No existían. Las programaciones viven en Azure Functions (NCRONTAB UTC). |
| Conector SECOP | Nuevo en `apps/api-azure/src/clients/secop.ts`. Campos validados contra metadatos oficiales. |

## Qué se mueve

- APIs HTTP → `apps/api-azure`
- Sincronización SECOP, alertas, vigencias, tareas, reconciliación → timers Azure Functions
- Persistencia de dominio → Dataverse (`tno_*`) cuando esté configurado; Memory solo en development/testing
- Autenticación de producción → Entra ID (SPA MSAL PKCE + JWT en Functions)

## Qué no se elimina

No se borra el código C# ni el esquema `tpo_` hasta validar sandbox y confirmar que no hay registros que mapear. El frontend de demostración permanece para desarrollo local.

## Procedimiento si existiera data previa

1. Inventariar empresas, membresías y auditoría en Dataverse `tpo_*` (si el sandbox llegó a aplicarse).
2. Exportar filas con `companykey`, `payload` y versión.
3. Reescribir logical names a `tno_*` sin cambiar IDs deterministas de empresa (país + NIT).
4. Verificar conteos y hashes antes de retirar tablas anteriores.
5. PostgreSQL/Supabase: no aplica. No hay dumps ni migraciones SQL en este repositorio.
