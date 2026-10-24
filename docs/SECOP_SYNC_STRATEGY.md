# Estrategia de sincronización SECOP

- No hay descarga histórica automática de millones de filas.
- Cada corrida pide un lote (`SECOP_SYNC_BATCH_SIZE`, máximo 200 en el arranque).
- Ventana por `fecha_de_ultima_publicaci` con solape y deduplicación por `(source, external_process_id)`.
- Fingerprint de campos relevantes; si cambia se guarda versión y evento.
- Workers: `SyncSecopIIProcesses`, `SyncSecopIProcesses`, `ReconcileSecopCatalog`.
- Sin `DATABASE_URL` el lote se lee y se reporta `persisted: false`.
