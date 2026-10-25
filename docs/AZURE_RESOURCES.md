# Recursos Azure

Definidos en `infra/functions.bicep`. **No se despliegan sin autorización.**

| Recurso | Uso |
| --- | --- |
| Function App Linux + plan Flex Consumption (FC1) | Runtime Node 22, programming model v4 |
| Storage Account (TLS 1.2, sin acceso público ni shared key) | AzureWebJobsStorage, paquetes, colas |
| Colas | `secop-sync`, `tender-alerts`, `notifications`, `dynamics-reconcile` |
| Application Insights + Log Analytics | Telemetría |
| Key Vault (RBAC) | Secretos. En prod, purge protection |
| Identidad administrada (sistema + asignada por usuario) | Storage, Insights, Graph/Dataverse cuando se asigne |
| Alerta de solicitudes fallidas | Application Insights |

Service Bus no se crea. Puede añadirse después si el volumen lo justifica.

El Bicep legado `infra/main.bicep` sigue describiendo Container Apps del BFF C#. No es el destino operativo de esta arquitectura.
