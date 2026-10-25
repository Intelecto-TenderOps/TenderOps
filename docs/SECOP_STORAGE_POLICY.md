# Política de almacenamiento SECOP

No se copia el histórico completo. La fuente oficial sigue siendo datos.gov.co.

## Nivel 1 — Catálogo reciente

Procesos publicados o modificados en los últimos `SECOP_RETENTION_DAYS` (90 por defecto).

La ventana es configurable. Si el volumen supera `SECOP_CATALOG_MAX_PER_RUN` o `SECOP_MAX_REQUESTS_PER_RUN`, la sincronización se detiene y reanuda con cursor. No se descarga automáticamente toda la ventana.

## Nivel 2 — Procesos relevantes

Se conservan fuera de los 90 días cuando:

- coinciden con una búsqueda guardada activa
- coinciden con criterios empresariales aprobados
- están en seguimiento (`watching`)
- fueron analizados
- tienen decisión
- tienen oportunidad Dynamics
- tienen tareas pendientes
- tienen documentos o evidencias

## Nivel 3 — Historial de cambios

`tno_secopchange` guarda solo cambios relevantes (estado, valor, fechas, modalidad, título, URL). No se genera una versión por cada sincronización idéntica (comparación por hash).

## Limpieza

`CleanupSecopCache` elimina del catálogo los procesos que ya no cumplen conservación. Las relaciones comerciales, decisiones, auditorías y evidencias de empresa no se borran con el catálogo.

## Provenance

Cada resultado indica si viene del catálogo (`catalog`), de SECOP en vivo (`secop`) o de ambos (`hybrid`). Un proceso con estado o fecha límite incierta no se presenta como vigente (`freshness=unknown|stale`).
