# Pruebas A–J del banco de perfiles

Implementadas en `apps/api-azure/tests/professionals.test.ts`. Complemento demo en `frontend/src/tests/professionals.test.ts`.

| Prueba | Resultado en Functions |
| --- | --- |
| A Importar 100 profesionales y relaciones | Cubierta |
| B Reimportar sin duplicar | Cubierta |
| C Dos HV con selecciones distintas | Cubierta |
| D Certificación vencida | Cubierta |
| E Experiencia específica con solapes | Cubierta (72 meses fusionados; cumplimiento pendiente si faltan soportes verificados) |
| F Variables de plantilla de entidad | Cubierta (`applyTemplateVariables`) |
| G Cuatro profesionales y cuatro HV | Cubierta; SharePoint `pending` |
| H Snapshot aprobado inmune al maestro | Cubierta |
| I Aislamiento entre empresas | Cubierta |
| J Experiencia sin soporte no acredita | Cubierta |

Ninguna prueba se ejecutó contra Dataverse, Graph o Copilot reales. Eso queda pendiente de secretos y sandbox.
