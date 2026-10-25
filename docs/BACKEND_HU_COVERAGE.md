# Cobertura backend de las 92 historias

Leyenda: **LIVE** = SECOP público implementado y consultable; **CODE** = servicio/conector implementado; **KEYS** = pendiente de credenciales Microsoft; **RES** = pendiente de PostgreSQL/Service Bus/Azure.

| ID | Historia | Backend | Estado |
|---|---|---|---|
| HU-A001 | Registrar una empresa licitante | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-A002 | Mantener capacidades y lineas de negocio | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-A003 | Registrar experiencia contractual | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-A004 | Configurar capacidad financiera | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-A005 | Gestionar cobertura geografica | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-A006 | Configurar reglas internas de participacion | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-A007 | Administrar usuarios equipos y roles | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-B008 | Configurar fuentes de oportunidades | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-B009 | Ingerir oportunidades de SECOP II | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-B010 | Habilitar modulos por pais | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-B011 | Programar el monitoreo automatico | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-B012 | Normalizar datos de distintas fuentes | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-B013 | Detectar cambios de una oportunidad | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-B014 | Controlar calidad de la ingesta | API `/api/v1` | CODE + KEYS — API y modelo listos; Dataverse no verificado |
| HU-C015 | Buscar oportunidades por texto | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-C016 | Filtrar oportunidades | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-C017 | Guardar una busqueda | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-C018 | Recibir alertas de nuevas coincidencias | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-C019 | Recibir alertas por cambios y adendas | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-C020 | Priorizar alertas por urgencia | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-C021 | Silenciar y reactivar alertas | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-D022 | Calcular encaje con la empresa | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-D023 | Mostrar bandeja priorizada | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-D024 | Explicar la recomendacion | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-D025 | Recalcular el encaje | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-D026 | Comparar oportunidades | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-D027 | Registrar interes o descarte preliminar | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-D028 | Asignar un analista responsable | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-E029 | Inventariar documentos del proceso | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-E030 | Descargar documentos de forma segura | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-E031 | Versionar documentos y adendas | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-E032 | Extraer texto y estructura | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-E033 | Visualizar documentos con citas | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-E034 | Marcar documentos revisados | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-E035 | Definir retencion documental | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-F036 | Clasificar documentos | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-F037 | Extraer requisitos atomicos | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-F038 | Extraer fechas e hitos | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-F039 | Extraer presupuesto y condiciones economicas | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-F040 | Evaluar experiencia habilitante | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-F041 | Evaluar capacidad financiera | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-F042 | Evaluar requisitos juridicos | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-F043 | Evaluar requisitos tecnicos | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-F044 | Estimar factores de puntuacion | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-F045 | Generar matriz de cumplimiento | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-G046 | Preparar recomendacion bid no bid | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-G047 | Registrar decision bid no bid | API `/api/v1` | CODE — motor determinista; persistencia KEYS/Dataverse |
| HU-G048 | Solicitar aprobaciones por disciplina | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-G049 | Comentar y mencionar colaboradores | API `/api/v1` | CODE + KEYS — API y modelo listos; Dataverse no verificado |
| HU-G050 | Mantener bitacora de decisiones | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-G051 | Gestionar conflictos y escalaciones | API `/api/v1` | CODE + KEYS — API y modelo listos; Dataverse no verificado |
| HU-G052 | Congelar una linea base de analisis | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-H053 | Mostrar documentos pendientes | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-H054 | Controlar vigencia de documentos empresariales | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-H055 | Crear checklist de propuesta | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-H056 | Asignar responsables de entregables | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-H057 | Adjuntar evidencia preparada | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-H058 | Validar completitud antes de cierre | API `/api/v1` | CODE — motor determinista; persistencia KEYS/Dataverse |
| HU-H059 | Generar paquete de trabajo | API `/api/v1` | CODE + KEYS — API y modelo listos; Dataverse no verificado |
| HU-H060 | Auditar el paquete final | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-I061 | Crear oportunidad en Dynamics 365 | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-I062 | Evitar oportunidades duplicadas | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-I063 | Mapear datos de licitacion a oportunidad | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-I064 | Vincular cuenta de entidad compradora | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-I065 | Sincronizar cambios hacia Dynamics | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-I066 | Recibir cambios desde Dynamics | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-I067 | Aplicar proceso de negocio de licitaciones | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-I068 | Relacionar analisis y documentos con la oportunidad | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-I069 | Cerrar oportunidad como ganada o perdida | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-I070 | Reconciliar integraciones | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-J071 | Crear tareas en Dynamics 365 | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-J072 | Actualizar tareas desde el checklist | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-J073 | Asignar tareas a usuarios o equipos | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-J074 | Calcular fechas de tareas | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-J075 | Notificar tareas proximas o vencidas | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-J076 | Completar tarea con evidencia | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-J077 | Ver carga de trabajo del equipo | API `/api/v1` | CODE + KEYS — Dynamics365Client |
| HU-K078 | Aislar datos por empresa | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-K079 | Autenticar la integracion con OAuth | API `/api/v1` | CODE + KEYS — API y modelo listos; Dataverse no verificado |
| HU-K080 | Aplicar privilegios minimos en Dataverse | API `/api/v1` | CODE — motor determinista; persistencia KEYS/Dataverse |
| HU-K081 | Auditar cambios sensibles | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-K082 | Proteger datos sensibles | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-K083 | Gestionar consentimiento y terminos de fuente | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-K084 | Configurar parametros por ambiente | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-K085 | Gestionar errores y reintentos | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-L086 | Medir embudo de oportunidades | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-L087 | Medir precision de recomendaciones | API `/api/v1` | CODE + KEYS — Graph/SharePoint; SECOP docs LIVE limitado |
| HU-L088 | Monitorear integraciones | API `/api/v1` | CODE + KEYS — API y modelo listos; Dataverse no verificado |
| HU-L089 | Definir niveles de servicio | API `/api/v1` | CODE + KEYS — CopilotStudioGateway |
| HU-L090 | Ejecutar pruebas de regresion | API `/api/v1` | LIVE / CODE — búsqueda y normalización reales; sync masiva RES |
| HU-L091 | Verificar accesibilidad y usabilidad | API `/api/v1` | CODE + KEYS — API y modelo listos; Dataverse no verificado |
| HU-L092 | Gestionar versiones y despliegues | API `/api/v1` | CODE + KEYS — API y modelo listos; Dataverse no verificado |
