# Cobertura backend de las 92 historias

Fecha: 25 de octubre de 2026, America/Bogota. Ninguna HU se marca aceptada en sandbox.

| HU | Título | Estado backend |
| --- | --- | --- |
| HU-A001 | Registrar una empresa licitante | Implementación de backend lista; aceptación externa pendiente. API de empresa + aislamiento implementados en Azure Functions; sandbox Dataverse pendiente |
| HU-A002 | Mantener capacidades y lineas de negocio | Implementación de backend lista; aceptación externa pendiente. Recurso capability portado; evaluación avanzada pendiente de Dataverse |
| HU-A003 | Registrar experiencia contractual | Implementación de backend lista; aceptación externa pendiente. Recurso experience/evidence; carga SharePoint pendiente de secretos |
| HU-A004 | Configurar capacidad financiera | Implementación de backend lista; aceptación externa pendiente. Cortes financieros con aprobación separada; FLS Dataverse pendiente |
| HU-A005 | Gestionar cobertura geografica | Implementación de backend lista; aceptación externa pendiente. Cobertura geográfica en API de perfil |
| HU-A006 | Configurar reglas internas de participacion | Implementación de backend lista; aceptación externa pendiente. Reglas versionadas; motor de evaluación determinista parcial |
| HU-A007 | Administrar usuarios equipos y roles | Implementación de backend lista; aceptación externa pendiente. Membresías y roles; privilegios Dataverse pendientes |
| HU-B008 | Configurar fuentes de oportunidades | Implementación de backend lista; aceptación externa pendiente. GET/POST sources y sourcepolicy; secretos fuera de Dataverse |
| HU-B009 | Ingerir oportunidades de SECOP II | Implementación de backend lista; aceptación externa pendiente. Conector SECOP II + upsert/cursor; sync real a Dataverse no comprobada |
| HU-B010 | Habilitar modulos por pais | Implementación de backend lista; aceptación externa pendiente. SECOP I/II habilitados; otros países no implementados |
| HU-B011 | Programar el monitoreo automatico | Implementación de backend lista; aceptación externa pendiente. Timers NCRONTAB con lock; no ejecutados en Azure hospedado |
| HU-B012 | Normalizar datos de distintas fuentes | Implementación de backend lista; aceptación externa pendiente. Normalización canónica SECOP I/II |
| HU-B013 | Detectar cambios de una oportunidad | Implementación de backend lista; aceptación externa pendiente. Hash + tno_secopchange para campos relevantes |
| HU-B014 | Controlar calidad de la ingesta | Implementación de backend lista; aceptación externa pendiente. Límites de lote, 429 y métricas de sync; DLQ operativa pendiente |
| HU-C015 | Buscar oportunidades por texto | Implementación de backend lista; aceptación externa pendiente. Búsqueda híbrida texto/id |
| HU-C016 | Filtrar oportunidades | Implementación de backend lista; aceptación externa pendiente. Filtros entidad, NIT, modalidad, geo, estado, valor, fechas, UNSPSC |
| HU-C017 | Guardar una busqueda | Implementación de backend lista; aceptación externa pendiente. Saved searches persistidas por empresa |
| HU-C018 | Recibir alertas de nuevas coincidencias | Implementación de backend lista; aceptación externa pendiente. EvaluateSavedSearches + alertas; no comprobado en prod |
| HU-C019 | Recibir alertas por cambios y adendas | Implementación de backend lista; aceptación externa pendiente. Cambios relevantes generan eventos de alerta |
| HU-C020 | Priorizar alertas por urgencia | Implementación de backend lista; aceptación externa pendiente. Urgencia en contrato de alerta |
| HU-C021 | Silenciar y reactivar alertas | Implementación de backend lista; aceptación externa pendiente. Silencio/lectura de alertas |
| HU-D022 | Calcular encaje con la empresa | Contrato/API preparados; aceptación pendiente. Contrato de assessment y pesos; scoring real de perfil pendiente |
| HU-D023 | Mostrar bandeja priorizada | Contrato/API preparados; aceptación pendiente. Bandeja frontend existente; API workspace lista |
| HU-D024 | Explicar la recomendacion | Contrato/API preparados; aceptación pendiente. Campo explanation en assessment |
| HU-D025 | Recalcular el encaje | Contrato/API preparados; aceptación pendiente. Recálculo de pesos |
| HU-D026 | Comparar oportunidades | Contrato/API preparados; aceptación pendiente. UI de comparación conservada |
| HU-D027 | Registrar interes o descarte preliminar | Contrato/API preparados; aceptación pendiente. Favorite/watch |
| HU-D028 | Asignar un analista responsable | Contrato/API preparados; aceptación pendiente. Owner en tender/candidate |
| HU-E029 | Inventariar documentos del proceso | Contrato/API preparados; aceptación pendiente. Listado de documentos de proceso |
| HU-E030 | Descargar documentos de forma segura | Contrato/API preparados; aceptación pendiente. Download seguro sigue 503 hasta Graph configurado |
| HU-E031 | Versionar documentos y adendas | Contrato/API preparados; aceptación pendiente. Versión y supersede en contrato |
| HU-E032 | Extraer texto y estructura | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-E033 | Visualizar documentos con citas | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-E034 | Marcar documentos revisados | Contrato/API preparados; aceptación pendiente. markReviewed en servicio |
| HU-E035 | Definir retencion documental | Contrato/API preparados; aceptación pendiente. Retención SECOP configurable; retención documental de empresa pendiente de política |
| HU-F036 | Clasificar documentos | Contrato/API preparados; aceptación pendiente. classify en documentsService |
| HU-F037 | Extraer requisitos atomicos | Contrato/API preparados; aceptación pendiente. Requirement store por empresa |
| HU-F038 | Extraer fechas e hitos | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-F039 | Extraer presupuesto y condiciones economicas | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-F040 | Evaluar experiencia habilitante | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-F041 | Evaluar capacidad financiera | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-F042 | Evaluar requisitos juridicos | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-F043 | Evaluar requisitos tecnicos | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-F044 | Estimar factores de puntuacion | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-F045 | Generar matriz de cumplimiento | Contrato/API preparados; aceptación pendiente. Matriz en frontend; backend lista requisitos |
| HU-G046 | Preparar recomendacion bid no bid | Contrato/API preparados; aceptación pendiente. Recommendation BID/NO_BID/REVISION |
| HU-G047 | Registrar decision bid no bid | Contrato/API preparados; aceptación pendiente. recordDecision exige política BID |
| HU-G048 | Solicitar aprobaciones por disciplina | Contrato/API preparados; aceptación pendiente. Approvals en workspace |
| HU-G049 | Comentar y mencionar colaboradores | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-G050 | Mantener bitacora de decisiones | Contrato/API preparados; aceptación pendiente. Auditoría de decisión |
| HU-G051 | Gestionar conflictos y escalaciones | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-G052 | Congelar una linea base de analisis | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-H053 | Mostrar documentos pendientes | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-H054 | Controlar vigencia de documentos empresariales | Contrato/API preparados; aceptación pendiente. CheckDocumentExpiration timer |
| HU-H055 | Crear checklist de propuesta | Contrato/API preparados; aceptación pendiente. Checklist/task contracts |
| HU-H056 | Asignar responsables de entregables | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-H057 | Adjuntar evidencia preparada | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-H058 | Validar completitud antes de cierre | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-H059 | Generar paquete de trabajo | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-H060 | Auditar el paquete final | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-I061 | Crear oportunidad en Dynamics 365 | Contrato/API preparados; aceptación pendiente. Cliente Dynamics createOpportunity; no ejecutado |
| HU-I062 | Evitar oportunidades duplicadas | Contrato/API preparados; aceptación pendiente. No se crea oportunidad sin BID |
| HU-I063 | Mapear datos de licitacion a oportunidad | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-I064 | Vincular cuenta de entidad compradora | Contrato/API preparados; aceptación pendiente. findAccounts preparado |
| HU-I065 | Sincronizar cambios hacia Dynamics | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-I066 | Recibir cambios desde Dynamics | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-I067 | Aplicar proceso de negocio de licitaciones | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-I068 | Relacionar analisis y documentos con la oportunidad | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-I069 | Cerrar oportunidad como ganada o perdida | Contrato/API preparados; aceptación pendiente. Cierre ganada/perdida en contrato |
| HU-I070 | Reconciliar integraciones | Contrato/API preparados; aceptación pendiente. ReconcileDynamics timer |
| HU-J071 | Crear tareas en Dynamics 365 | Contrato/API preparados; aceptación pendiente. createTask Dynamics preparado |
| HU-J072 | Actualizar tareas desde el checklist | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-J073 | Asignar tareas a usuarios o equipos | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-J074 | Calcular fechas de tareas | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-J075 | Notificar tareas proximas o vencidas | Contrato/API preparados; aceptación pendiente. CheckTaskDeadlines |
| HU-J076 | Completar tarea con evidencia | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-J077 | Ver carga de trabajo del equipo | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-K078 | Aislar datos por empresa | Implementación de backend lista; aceptación externa pendiente. Autorización por empresa en todos los recursos |
| HU-K079 | Autenticar la integracion con OAuth | Implementación de backend lista; aceptación externa pendiente. JWT Entra + clientes OAuth; login real no ejecutado |
| HU-K080 | Aplicar privilegios minimos en Dataverse | Implementación de backend lista; aceptación externa pendiente. Esquema tno_ y roles documentados; no aplicados en sandbox |
| HU-K081 | Auditar cambios sensibles | Implementación de backend lista; aceptación externa pendiente. Auditoría append-only |
| HU-K082 | Proteger datos sensibles | Implementación de backend lista; aceptación externa pendiente. Fail closed; sin secretos en frontend |
| HU-K083 | Gestionar consentimiento y terminos de fuente | Implementación de backend lista; aceptación externa pendiente. sourcepolicy y autorización de términos |
| HU-K084 | Configurar parametros por ambiente | Implementación de backend lista; aceptación externa pendiente. .env.example y Bicep por entorno |
| HU-K085 | Gestionar errores y reintentos | Implementación de backend lista; aceptación externa pendiente. Errores seguros, retry 429, idempotencia |
| HU-L086 | Medir embudo de oportunidades | Implementación de backend lista; aceptación externa pendiente. Analytics overview/funnel preparado |
| HU-L087 | Medir precision de recomendaciones | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-L088 | Monitorear integraciones | Implementación de backend lista; aceptación externa pendiente. Integrations status honesto; Insights en Bicep |
| HU-L089 | Definir niveles de servicio | Contrato/API preparados; aceptación pendiente. SLO en UI demo; no medido |
| HU-L090 | Ejecutar pruebas de regresion | Implementación de backend lista; aceptación externa pendiente. Vitest API 14 casos; e2e Azure no sustituye el de C# |
| HU-L091 | Verificar accesibilidad y usabilidad | Pendiente de validación o de integración externa. UI o contrato existentes; no acreditado como flujo Azure comprobado |
| HU-L092 | Gestionar versiones y despliegues | Implementación de backend lista; aceptación externa pendiente. Bicep Functions + docs de versión; rollback Azure no ensayado |

Resumen honesto: APIs, sync SECOP, aislamiento y contratos están en el repositorio. Entra/Dataverse/Dynamics/SharePoint/Copilot no se comprobaron con credenciales reales.
