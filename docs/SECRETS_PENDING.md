# Secretos e identificadores pendientes

No se solicitan todavía. La solución arranca en local sin ellos.

| Variable | Estado | Notas |
| --- | --- | --- |
| `AZURE_TENANT_ID` | Pendiente | Directorio Entra |
| `ENTRA_SPA_CLIENT_ID` | Pendiente | App SPA, redirect del origen Vercel |
| `ENTRA_API_CLIENT_ID` / `ENTRA_API_AUDIENCE` / `ENTRA_API_SCOPE` | Pendiente | API protegida |
| `ENTRA_SERVICE_CLIENT_ID` | Pendiente | Identidad de integración |
| `DATAVERSE_URL` / `DATAVERSE_ENVIRONMENT_ID` | Pendiente | Organización |
| Certificado o identidad Dataverse | Pendiente | Application user, no System Administrator |
| `DYNAMICS_BASE_URL` / `DYNAMICS_ENVIRONMENT_ID` | Pendiente | Sales |
| `SHAREPOINT_SITE_ID` / `SHAREPOINT_DRIVE_ID` | Pendiente | El URL del sitio ya está documentado |
| `COPILOT_*_AGENT_ID` / `COPILOT_ENVIRONMENT_ID` | Pendiente | Puede requerir licenciamiento Copilot Studio |
| `SOCRATA_APP_TOKEN` | Opcional | Mejora cupo; no es secreto de negocio |
| `AZURE_STORAGE_ACCOUNT_NAME` | Tras el despliegue Bicep | |
| `AZURE_KEY_VAULT_URL` | Tras el despliegue Bicep | |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Tras el despliegue Bicep | |
| `AZURE_FUNCTIONS_BASE_URL` | Tras el despliegue | Origen real, nunca un placeholder de producción |

No colocar Function Keys ni secretos en variables `VITE_*`.
