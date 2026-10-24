# Limitaciones conocidas

- SECOP público tiene cupos y no es tiempo real. Last-Modified del proveedor se propaga en la respuesta.
- `fecha_de_recepcion_de` falta en muchos registros: el cierre queda `null`.
- `estado_de_apertura_del_proceso=Abierto` aparece en procesos históricos ya seleccionados.
- dmgg-8hin no cubre documentos anteriores a 2025.
- Los conjuntos de modificaciones no son un historial completo.
- Dynamics, Dataverse, Graph y Copilot están implementados y bloqueados por credenciales: responden `integration_unconfigured`, nunca un éxito falso.
- El índice de millones de filas no se descarga automáticamente.
- La validación JWT de Entra queda lista; sin `ENTRA_API_AUDIENCE` las rutas privadas no se fingen autenticadas con un usuario real.
