# Plantilla Excel

Archivo: `tenderops-banco-perfiles.xlsx`.

Hojas: Profesionales, Formación, Experiencias, Certificaciones, Competencias, Acreditaciones, Instrucciones.

La fila de ejemplo usa a **María Camila Suárez Ficticia**. No corresponde a una persona real.

## Campos obligatorios

- Profesionales: ID Externo, Nombres, Apellidos.
- Formación: ID Externo Profesional, Nivel, Título.
- Experiencias: ID Externo Profesional, Empresa, Cargo, Fecha inicio.
- Certificaciones: ID Externo Profesional, Nombre.

Fechas `AAAA-MM-DD`. Celdas vacías = dato ausente.

Las hojas hijas se relacionan por el mismo ID Externo. `ID Estudio` / `ID Experiencia` / `ID Certificación` identifican el registro hijo y no sustituyen el ID del profesional.
