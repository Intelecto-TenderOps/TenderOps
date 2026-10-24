# Flujos asíncronos

```mermaid
sequenceDiagram
  participant API as Vercel API
  participant SB as Service Bus
  participant FN as Azure Functions
  API->>SB: enqueue(job)
  API-->>Browser: 202 jobId
  SB->>FN: consume
  FN->>FN: process / retry / DLQ
  Browser->>API: GET status
```

Estados: pendiente, en cola, ejecutando, esperando integración, esperando revisión, finalizado, fallido, cancelado.

Sin Service Bus, `POST /secop/sync` ejecuta un lote limitado en línea y lo declara como tal.
