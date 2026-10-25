# Sincronización SECOP

## Fuentes

| Fuente | Dataset | Tipo |
| --- | --- | --- |
| SECOP II | `p6dx-8zbt` | Procesos de contratación |
| SECOP I | `f789-7hwg` | Contratos / procesos históricos |

Campos canónicos validados contra `/api/views/{dataset}.json`.

## Funciones programadas (UTC, NCRONTAB de 6 posiciones)

| Función | Expresión inicial | Propósito |
| --- | --- | --- |
| `SyncSecopRecent` | `0 0 * * * *` | Nuevos y recientes |
| `SyncSecopChanges` | `0 0 * * * *` | Modificaciones relevantes |
| `SyncMonitoredTenders` | `0 0 * * * *` | Procesos seguidos o analizados |
| `EvaluateSavedSearches` | `0 0 * * * *` | Coincidencias de búsquedas |
| `GenerateTenderAlerts` | `0 0 * * * *` | Alertas |
| `ReconcileDynamics` | `0 0 */4 * * *` | Cada 4 horas |
| `CheckDocumentExpiration` | `0 0 6 * * *` | Diario 06:00 UTC |
| `CheckTaskDeadlines` | `0 15 6 * * *` | Diario |
| `CleanupSecopCache` | `0 30 6 * * *` | Diario |

Las fechas de negocio se interpretan en `America/Bogota`. Consultar SECOP cada minuto no produce información nueva; la frecuencia sigue la actualización oficial.

## Pipeline de cada sync

1. Leer configuración
2. Verificar última ejecución
3. Determinar ventana
4. Consultar SECOP (lotes)
5. Validar
6. Normalizar
7. Detectar existentes
8. Identificar cambios
9. Upsert
10. Historial relevante
11. Eventos
12. Cursor
13. Métricas
14. Errores

Incluye bloqueo contra solapes, reintentos, 429/`Retry-After`, idempotencia y tope de solicitudes. No relanza una carga histórica completa.

## Búsqueda híbrida

`GET /api/v1/secop/processes` consulta primero el catálogo si está fresco. Si la búsqueda es general, histórica o no está cubierta, consulta la API pública. El cliente no necesita que el proceso esté almacenado para localizarlo.
