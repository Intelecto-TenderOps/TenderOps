# Banco de Perfiles Profesionales

TenderOps distingue cuatro conceptos y no los mezcla en una sola tabla de personas.

| Concepto | Qué es | Dónde vive |
| --- | --- | --- |
| Profesional | Persona real del banco de la empresa | `tno_professional` y colecciones hijas |
| Perfil requerido | Cargo exigido por la entidad en un proceso | `tno_tenderstaffrole` |
| Profesional propuesto | Asignación de una persona a un cargo de un proceso | `tno_tenderprofessionalassignment` |
| Hoja de vida generada | Documento derivado, con selección congelada | `tno_generatedresume` + versión |

## Rutas

- `/perfiles` — módulo de primer nivel (menú derecho **Banco de Perfiles**).
- `/empresa` incluye un acceso al mismo banco.
- `/procesos/:id/personal` — pestaña **Personal Propuesto** del expediente.
- `/procesos/:id/preparacion` y `/preparacion` muestran la sección **Personal y hojas de vida**.

## Capacidades

- Ficha maestra con estudios, experiencias, certificaciones, matrículas, competencias, soportes y consentimiento.
- Importación Excel de siete hojas, mapeo, previsualización y confirmación. No se guarda el archivo completo sin validar.
- Búsqueda y filtros en backend (`GET /api/v1/professionals`) con etiquetas removibles en la UI.
- Evaluación determinista en Azure Functions. Copilot Studio (agente Candidatos) interpreta; no asigna ni inventa evidencia.
- Constructor de hojas de vida (`ResumeBuilder`) por panel lateral extraancho, sin modales centrales.
- La HV aprobada conserva su snapshot si el maestro cambia después.

## Integraciones pendientes

SharePoint/Graph y Copilot Studio quedan implementados y configurables. Si no hay secretos, el estado real es `pending_sharepoint` / `copilot_not_configured`. No se simula un entorno productivo conectado.
