# Entrega preliminar para Azure Functions

El frontend no llama todavía a Functions. Cada servicio de `frontend/src/services` es el contrato que el backend deberá honrar.

## Servicios previstos

| Servicio | Recursos canónicos |
|---|---|
| `tendersService` | `GET /tenders`, `GET /tenders/{id}`, favoritos y búsquedas |
| `assessmentsService` | `GET /assessments`, `POST /assessments/{id}/recalculate`, ponderaciones |
| `documentsService` | inventario, revisión, clasificación, referencia SharePoint |
| `complianceService` | matriz, actualización de requisito y estado Copiado |
| `decisionsService` | recomendación, decisión humana, comentarios, aprobaciones |
| `opportunitiesService` | alta simulada hacia Dynamics, cierre ganado/perdido |
| `tasksService` | CRUD y asignación, `dynamicsTaskId` opcional |
| `copilotService` | hilos y acciones propuestas, sin Copilot Studio real |
| `analyticsService` | embudo, tasas y series |
| `adminService` | usuarios, fuentes, auditoría, integraciones |
| `companyService` | empresa, capacidades, experiencia, finanzas, cobertura, reglas |

## Encabezados futuros

- Autenticación Entra ID (Bearer)
- Empresa activa (`X-Company-Id`)
- Correlación (`X-Correlation-Id`)
- Idempotencia en escrituras

## Semántica

- Upsert de procesos por `country + source + externalProcessId`
- Los valores monetarios se envían en la moneda origen; la UI formatea COP
- Los documentos solo transportan metadatos y un `sharePointId`
- Las decisiones humanas se versionan aparte de las recomendaciones del motor

## Lo que no debe hacer el frontend

No debe hablar en esta fase con Dataverse, Dynamics, SharePoint ni Copilot Studio. El único cliente HTTP previsto es el de Azure Functions.
