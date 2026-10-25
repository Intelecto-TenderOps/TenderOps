# Despliegue Azure

`infra/main.bicep` ya define Log Analytics, App Insights, Storage, Key Vault, Service Bus y Container Apps para el API/worker .NET.

Los workers TypeScript de `workers/` se publican como Function App adicional cuando se autorice el recurso. No se crean recursos en esta entrega.

Riesgo de costo: Service Bus Standard y retención de logs. Usar identidad administrada; `allowSharedKeyAccess` está desactivado en storage.
