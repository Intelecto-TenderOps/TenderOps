# Mapeo de campos SECOP

## SECOP II (`p6dx-8zbt`)

| Origen | TenderOps |
|---|---|
| `id_del_proceso` | `externalProcessId` |
| `referencia_del_proceso` | `processReference` |
| `id_del_portafolio` | `portfolioId` |
| `entidad` | `entityName` |
| `nit_entidad` | `entityNit` |
| `nombre_del_procedimiento` | `title` |
| `descripci_n_del_procedimiento` | `subject` |
| `fase` | `phase` |
| `estado_del_procedimiento` | `sourceStatus` |
| `estado_de_apertura_del_proceso` | `sourceOpeningStatus` |
| `fecha_de_publicacion_del` | `publicationDate` |
| `fecha_de_ultima_publicaci` | `lastSourcePublicationDate` |
| `fecha_de_recepcion_de` | `closingDate` (solo si existe) |
| `precio_base` | `estimatedValue` (texto numérico) |
| `modalidad_de_contratacion` | `modality` |
| `departamento_entidad` | `department` |
| `ciudad_entidad` | `municipality` |
| `codigo_principal_de_categoria` | `mainCategoryCode` |
| `urlproceso` / `urlproceso.url` | `sourceUrl` |

## SECOP I (`f789-7hwg`)

No comparte esquema con SECOP II. Identidad: `uid`. No se usa `fecha_fin_ejec_contrato` como cierre de ofertas.

## Verificación

Los nombres de columna de SECOP II se contrastaron con `https://www.datos.gov.co/api/views/p6dx-8zbt.json` el 2026-10-24.
