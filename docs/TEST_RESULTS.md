# Resultados de prueba

Fecha: 25 de octubre de 2026, America/Bogota. Entorno del agente. Sin credenciales Microsoft de producción.

## Azure Functions (`apps/api-azure`)

| Verificación | Resultado |
| --- | --- |
| `tsc --noEmit` | Correcto |
| Vitest | 14/14 correctos |
| Autenticación anónima | 401 `authentication_required` con correlationId |
| Aislamiento multiempresa | 403 entre DEMO-A y DEMO-B |
| Idempotencia / If-Match | Replay estable; 428 sin ETag |
| Permiso financiero del administrador | 403 |
| Normalización SECOP II | Campos oficiales |
| Detección de cambios | Solo campos relevantes |
| Retención 90 días | Conserva relevantes; elimina el resto |
| Metadatos oficiales `p6dx-8zbt` | Campos canónicos presentes |
| Consulta real SECOP II | 1 página obtenida de datos.gov.co |
| Dynamics / Graph / Copilot / Dataverse real | No ejecutados: integraciones deshabilitadas sin secretos |

## Frontend

| Verificación | Resultado |
| --- | --- |
| Vitest | 4/4 correctos |
| ESLint | Sin errores nuevos (warning preexistente en RichDataTable) |
| `tsc -b` | Correcto |

El modo demo permanece por defecto; no se alteró el diseño visual.

## No ejecutado

- Login Entra real
- Upsert Dataverse sandbox
- Creación de oportunidades Dynamics
- Carga SharePoint
- Invocación Copilot Studio
- Despliegue Bicep
- `func start` con Azurite en este entorno

Estas ausencias no se ocultan con datos ficticios de producción.
