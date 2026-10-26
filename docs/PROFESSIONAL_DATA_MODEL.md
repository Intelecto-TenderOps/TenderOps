# Modelo de datos del banco de perfiles

Prefijo Dataverse: `tno_`. Fuente: `powerplatform/schema-tno.json`.

## Tablas

- `tno_professional` — maestro. Ámbito de empresa. El número de documento se hashea (`company|tipo|número`) y se enmascara en la API. No es llave pública.
- `tno_professionalrole` — roles/especialidades que la persona puede desempeñar.
- `tno_professionaleducation`
- `tno_professionalexperience` — periodos simultáneos permitidos; el cómputo usa fusión de meses, no suma.
- `tno_professionalcertification` — vigencia propia; vencida no se presenta como vigente.
- `tno_professionallicense` — matrícula/tarjeta; sin datos suficientes el estado es `sin_confirmar`.
- `tno_professionalskill`
- `tno_professionalattachment` — metadatos; el archivo está en SharePoint.
- `tno_professionalavailability`
- `tno_professionalconsent` — Ley 1581: almacenar, consultar, presentar, compartir.
- `tno_professionalimportbatch` / `tno_professionalimportissue`
- `tno_tenderstaffrole` / `tno_tenderstaffrequirement`
- `tno_tenderprofessionalassignment`
- `tno_resumeconfiguration` — selección de IDs, no textos libres como fuente de verdad.
- `tno_generatedresume` / `tno_generatedresumeversion` / `tno_resumegenerationjob`

## Relaciones

Empresa 1—N Profesional 1—N estudios, experiencias, certificaciones, licencias, soportes, consentimientos.

Proceso/candidatura 1—N perfiles requeridos 1—N asignaciones N—1 profesional.

Hoja de vida N—1 profesional, N—1 proceso, N—1 configuración. El snapshot no se reescribe al actualizar el maestro.

## Persistencia de demostración

Mientras Dataverse no esté aprovisionado, Azure Functions usa `MemoryStore` con las mismas tablas lógicas. El frontend demo usa el workspace Zustand.
