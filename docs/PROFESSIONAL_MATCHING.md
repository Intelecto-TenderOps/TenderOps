# Evaluación determinista de profesionales

Implementada en Azure Functions (`domains/professionals/matching.ts`) y replicada en el frontend demo para previsualización.

## Qué compara

Profesión aceptada, nivel académico, experiencia general, experiencia específica (criterio del pliego), certificaciones, matrícula si el proceso la exige, consentimiento y disponibilidad.

## Experiencia

Los periodos superpuestos se fusionan. No se suman como tiempo extra. Se distinguen general y específica. La experiencia posterior a título o matrícula solo se aplica si el perfil requerido lo indica; no es regla universal.

Solo la evidencia verificada con soporte acredita `cumple`. Si hay tiempo suficiente pero faltan soportes: `pendiente_validar`. Si no alcanza: `no_cumple` o `cumple_parcial` cuando el requisito admite esa clasificación.

No se marca cumplimiento por similitud vaga de textos. El criterio se tokeniza y se busca en cargo, proyecto, funciones, tecnologías y sector.

## Copilot Studio

El agente Candidatos puede proponer estructura de perfiles y explicar coincidencias. La evaluación numérica/determinista corre en Functions. Sin conexión, el backend declara `copilot_not_configured` y sigue permitiendo captura manual.
