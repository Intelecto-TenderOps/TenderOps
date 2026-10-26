# Importación Excel del banco de perfiles

Prioritaria. El flujo UI es un panel lateral de siete pasos: archivo, estructura, mapeo, validación, revisión, confirmación, resultado.

## API

- `GET /api/v1/professionals/import-template` — XLSX real (ExcelJS). `Accept: application/json` devuelve `contentBase64`.
- `POST /api/v1/professionals/imports` — analiza, no confirma.
- `GET /api/v1/professionals/imports/{id}` y `/preview`
- `PATCH /api/v1/professionals/imports/{id}/mapping`
- `POST /api/v1/professionals/imports/{id}/commit` — `duplicateAction`: conservar | actualizar | omitir | revisar
- `GET /api/v1/professionals/imports/{id}/errors` — Excel de incidencias
- `GET/POST /api/v1/professionals/mapping-profiles`

## Reglas

- Idempotencia por `externalId` de empresa. No se identifica solo por nombre.
- El documento de identidad se usa para huella interna y no viaja como id público.
- No se borran profesionales ausentes en la nueva carga.
- Experiencias y certificaciones `verificado` no se reemplazan en silencio.
- Política por defecto: `partial`. `fail_fast` rechaza el lote si hay errores.
- No se ejecutan macros ni fórmulas.
- Los PDF no viajan en el Excel. Soportes: carga individual, ZIP o referencia SharePoint (`POST /professionals/{id}/supports`). Sin Graph el estado es `pendiente`.
- Límites de tamaño y lotes se aplican en Functions; Dataverse real aún no está verificado.
