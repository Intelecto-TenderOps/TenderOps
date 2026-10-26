# Cobertura frontend de las 92 historias

Leyenda: **UI** = pantalla implementada; **SIM** = comportamiento de demostración; **BE** = pendiente de Azure Functions / sistemas Microsoft.

| ID | Historia | Ruta | Estado |
|---|---|---|---|
| HU-A001 | Registrar una empresa licitante | `/empresa` | UI + SIM; BE Entra/Dataverse |
| HU-A002 | Capacidades y líneas de negocio | `/empresa/capacidades` | UI + SIM |
| HU-A003 | Experiencia contractual | `/empresa/experiencia` | UI + SIM (flujo 5 pasos) |
| HU-A004 | Capacidad financiera | `/empresa/financiera` | UI + SIM |
| HU-A005 | Cobertura geográfica | `/empresa/cobertura` | UI + SIM |
| HU-A006 | Reglas de participación | `/empresa/reglas` | UI + SIM |
| HU-A007 | Usuarios, equipos y roles | `/empresa/usuarios` | UI + SIM |
| HU-B008 | Configurar fuentes | `/administracion/fuentes` | UI + SIM |
| HU-B009 | Ingerir SECOP II | `/explorar` | UI con lote semilla; BE conector |
| HU-B010 | Módulos por país | `/administracion/parametros` | UI bandera Colombia; BE adaptadores |
| HU-B011 | Monitoreo automático | `/administracion/fuentes` | UI estado; BE scheduler |
| HU-B012 | Normalizar fuentes | contratos `Tender` | SIM; BE DTO canónico |
| HU-B013 | Detectar cambios | `/alertas` | UI cambios/adendas; BE hash |
| HU-B014 | Calidad de ingesta | `/administracion` | UI salud de fuente; BE métricas |
| HU-C015 | Buscar por texto | `/explorar` | UI + SIM + URL |
| HU-C016 | Filtrar oportunidades | `/explorar` | UI + chips |
| HU-C017 | Guardar búsqueda | `/explorar` | UI flujo; persistencia local |
| HU-C018 | Alertas de coincidencias | `/alertas` | UI + SIM |
| HU-C019 | Alertas de cambios y adendas | `/alertas` | UI + SIM |
| HU-C020 | Priorizar por urgencia | `/alertas` | UI |
| HU-C021 | Silenciar y reactivar | `/alertas` | UI + SIM |
| HU-D022 | Calcular encaje | `/calificacion` | UI + recálculo local |
| HU-D023 | Bandeja priorizada | `/calificacion` | UI |
| HU-D024 | Explicar recomendación | expediente / calificación | UI |
| HU-D025 | Recalcular encaje | `/calificacion` | SIM local |
| HU-D026 | Comparar oportunidades | `/explorar` lote | UI flujo amplio |
| HU-D027 | Interés o descarte | decisión | UI + SIM |
| HU-D028 | Asignar analista | flujo Asignar | UI + chips |
| HU-E029 | Inventariar documentos | `/procesos/:id/documentos` | UI |
| HU-E030 | Descarga segura | documentos | UI referencia; BE blob |
| HU-E031 | Versionar documentos | documentos | UI versión; BE storage |
| HU-E032 | Extraer texto | evidencias | UI extracto simulado |
| HU-E033 | Visualizar con citas | `EvidenceViewer` | UI |
| HU-E034 | Marcar revisados | documentos | UI + SIM |
| HU-E035 | Retención documental | `/administracion/parametros` | UI propuesta |
| HU-F036 | Clasificar documentos | documentos / lote | UI |
| HU-F037 | Extraer requisitos | `/procesos/:id/requisitos` | UI semilla |
| HU-F038 | Extraer fechas | expediente | UI fechas de proceso |
| HU-F039 | Extraer presupuesto | expediente | UI valor |
| HU-F040 | Evaluar experiencia | matriz / calificación | UI |
| HU-F041 | Evaluar capacidad financiera | matriz | UI |
| HU-F042 | Evaluar jurídicos | matriz | UI |
| HU-F043 | Evaluar técnicos | matriz | UI |
| HU-F044 | Factores de puntuación | ponderaciones | UI + SIM |
| HU-F045 | Matriz de cumplimiento | `/procesos/:id/matriz` | UI interactiva |
| HU-G046 | Recomendación BID/NO BID | `/procesos/:id/decision` | UI |
| HU-G047 | Registrar decisión | flujo 3 pasos | UI + SIM |
| HU-G048 | Aprobaciones por disciplina | decisión | UI |
| HU-G049 | Comentar | decisión | UI listado; alta SIM |
| HU-G050 | Bitácora | historial | UI |
| HU-G051 | Escalaciones | decisión | UI |
| HU-G052 | Línea base | decisión versión | UI indicador |
| HU-H053 | Documentos pendientes | `/preparacion` | UI |
| HU-H054 | Vigencia empresarial | `/preparacion` | UI |
| HU-H055 | Checklist | `/procesos/:id/preparacion` | UI |
| HU-H056 | Asignar entregables | flujo Asignar | UI |
| HU-H057 | Adjuntar evidencia | preparación | UI flujo |
| HU-H058 | Completitud | anillo de avance | UI |
| HU-H059 | Paquete de trabajo | preparación | UI manifiesto simulado |
| HU-H060 | Auditar paquete | historial | UI |
| HU-I061 | Crear oportunidad Dynamics | `/oportunidades` | UI simulada |
| HU-I062 | Evitar duplicados | flujo alta | UI aviso |
| HU-I063 | Mapear licitación | flujo alta | UI |
| HU-I064 | Vincular cuenta | flujo alta | UI |
| HU-I065 | Sync hacia Dynamics | integraciones | UI estado simulada |
| HU-I066 | Recibir cambios Dynamics | integraciones | UI |
| HU-I067 | BPF de licitaciones | etapas | UI |
| HU-I068 | Relacionar análisis | ficha oportunidad | UI |
| HU-I069 | Cerrar ganada/perdida | oportunidades | UI + SIM |
| HU-I070 | Reconciliar | administración | UI |
| HU-J071 | Crear tareas Dynamics | `/tareas` | UI + `dynamicsTaskId` |
| HU-J072 | Actualizar desde checklist | preparación | UI |
| HU-J073 | Asignar a usuarios/equipos | chips | UI |
| HU-J074 | Calcular fechas | formulario | UI manual |
| HU-J075 | Notificar vencidas | panorama | UI listado; BE avisos |
| HU-J076 | Completar con evidencia | tareas | UI |
| HU-J077 | Carga del equipo | vista carga | UI |
| HU-K078 | Aislar por empresa | selector | UI demo; BE tenant |
| HU-K079 | OAuth de integración | integraciones | UI desconectada |
| HU-K080 | Privilegios Dataverse | admin roles | UI catálogo |
| HU-K081 | Auditar cambios | `/administracion/auditoria` | UI |
| HU-K082 | Proteger sensibles | demo banner | UI; BE cifrado |
| HU-K083 | Consentimiento de fuente | fuentes | UI toggle |
| HU-K084 | Parámetros por ambiente | parámetros | UI |
| HU-K085 | Errores y reintentos | estados de flujo | UI; BE colas |
| HU-L086 | Embudo | `/analitica` `/panorama` | UI |
| HU-L087 | Precisión de recomendaciones | analítica | UI tasa demo |
| HU-L088 | Monitorear integraciones | admin | UI |
| HU-L089 | Niveles de servicio | parámetros | UI propuesta |
| HU-L090 | Pruebas de regresión | `npm test` + e2e | UI automatizada |
| HU-L091 | Accesibilidad | drawers, chips, foco | UI parcial |
| HU-L092 | Versiones y despliegues | `1.1.0` | UI; BE pipeline |
| HU-PER-001 a 011 | Banco de perfiles | `/perfiles` | UI + SIM; BE Azure Functions |
| HU-PER-012 a 014 | Personal propuesto | `/procesos/:id/personal` | UI + matching demo; BE matching |
| HU-PER-015 a 022 | ResumeBuilder | flujo extraancho | UI selección granular; BE DOCX |
| HU-PER-023 a 024 | Matriz y paquete | preparación / matriz | UI; paquete no se declara completo sin HV |
| HU-PER-025 | Consentimiento | ficha del profesional | UI + SIM |

Ninguna historia está conectada a un servicio real de Microsoft en esta entrega.
