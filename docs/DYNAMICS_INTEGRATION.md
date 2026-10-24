# Dynamics 365

Cliente: `Dynamics365Client` sobre Dataverse Web API.

Maestro comercial: cuentas, contactos, oportunidades, tareas, etapas y cierre.

TenderOps no sobrescribe esos campos con datos SECOP.

Alta `POST /api/v1/opportunities/from-tender` exige decisión autorizada en el caso de uso; sin credenciales responde `integration_unconfigured`.

Campos personalizados (`secopId`, expediente, versión de evaluación) se documentan para la solución Dataverse; no se asume que existan hasta importar la solución.
