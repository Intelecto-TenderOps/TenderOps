# Especificación del conector SECOP

## Fuentes

| Fuente | Dataset | API |
|---|---|---|
| SECOP II procesos | `p6dx-8zbt` | `https://www.datos.gov.co/resource/p6dx-8zbt.json` |
| SECOP I procesos | `f789-7hwg` | `https://www.datos.gov.co/resource/f789-7hwg.json` |
| SECOP II modificaciones | `e2u2-swiw` | `https://www.datos.gov.co/resource/e2u2-swiw.json` |
| SECOP I modificaciones | `36vw-pbq2` | `https://www.datos.gov.co/resource/36vw-pbq2.json` |
| SECOP II archivos 2025+ | `dmgg-8hin` | `https://www.datos.gov.co/resource/dmgg-8hin.json` |

## Cliente

`SocrataClient` construye SoQL con lista blanca de columnas y operadores, respeta `429`/`Retry-After`, aplica timeout, reintentos y circuit breaker.

Token opcional: encabezado `X-App-Token`.

## Modos

- `live`: consulta Socrata (predeterminado, funciona sin credenciales privadas).
- `indexed`: solo PostgreSQL. Si no hay `DATABASE_URL` no se finge un índice.
- `hybrid`: índice primero; Socrata para identificadores exactos o si el índice está vacío.

## Cierre

La fecha de recepción de ofertas en SECOP II es `fecha_de_recepcion_de`. Si falta, `closingDate` queda `null`. El indicador `estado_de_apertura_del_proceso=Abierto` no basta para declarar un proceso vigente.
