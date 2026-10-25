# Estrategia de sincronización SECOP

- No hay descarga histórica automática de millones de filas.
- Cada corrida pide una ventana reciente (`SECOP_LOOKBACK_HOURS`, por defecto 72 h) y hasta `SECOP_SYNC_PAGES` páginas de `SECOP_SYNC_BATCH_SIZE`.
- Ventana por `fecha_de_ultima_publicaci` (II) o `fecha_de_cargue_en_el_secop` (I), con solape y deduplicación por id.
- El catálogo local (memoria + `.local/secop-catalog.json`, o `/tmp` en Vercel) alimenta el modo `hybrid`.
- Recurrencia:
  - API local: `startSecopPoller()` cada `SECOP_POLL_INTERVAL_MS` (60 s).
  - Vercel: cron `GET /api/v1/secop/sync` (`* * * * *`; Hobby puede degradar a diario).
  - Explorar: `refetchInterval` 45 s sobre la consulta en vivo.
  - Cada listado dispara un refresh si el último intento es más viejo que el intervalo.
- `SOCRATA_APP_TOKEN` via `X-App-Token`. El token no se commitea ni se expone en status (`tokenConfigured` es boolean).
- Workers: `SyncSecopIIProcesses`, `SyncSecopIProcesses`, `SyncSecopRecent`, `ReconcileSecopCatalog`.
- Sin `DATABASE_URL` el lote queda en el catálogo local. Con Postgres también se hace upsert.
