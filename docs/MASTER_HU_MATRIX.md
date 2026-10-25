# Matriz documento maestro v3 vs código

Fuente: `TenderOps_Documento_Maestro_Arquitectura_Copilot_Dynamics_Dataverse_v3` (112 HUs, épicas A–N).

Leyenda: **conectada** = UI + API real usable ahora; **cableada ahora** = el front llama la API y muestra el estado; **bloqueada por credencial** = conector/API listos, Microsoft fail-closed (503 / `integration_unconfigured`); **no aplica** = gobierno, ADR o fuera de este incremento.

| ID | Historia | Estado | Archivos |
|---|---|---|---|
| HU-A001 | Registrar empresa licitante | cableada ahora + bloqueada por credencial | `frontend/src/features/empresa/EmpresaPage.tsx`, `companyService.ts`, `packages/backend/src/http/handler.ts` `/companies` |
| HU-A002 | Capacidades y líneas | cableada ahora + bloqueada por credencial | `EmpresaPage.tsx`, `companyService.ts`, Dataverse `/companies/:id/capabilities` |
| HU-A003 | Experiencia contractual | cableada ahora + bloqueada por credencial | `FlowHost.tsx` create-experience, SharePoint 503 |
| HU-A004 | Capacidad financiera | cableada ahora + bloqueada por credencial | `EmpresaPage.tsx`, Dataverse |
| HU-A005 | Cobertura geográfica | cableada ahora + bloqueada por credencial | `EmpresaPage.tsx`, Dataverse |
| HU-A006 | Reglas de participación | cableada ahora + bloqueada por credencial | `EmpresaPage.tsx`, Dataverse |
| HU-A007 | Usuarios, equipos y roles | cableada ahora + bloqueada por credencial | `AdministracionPage.tsx` usuarios, Entra/Dataverse |
| HU-B008 | Configurar fuentes | conectada (SECOP) / bloqueada (otras) | `adminService.ts`, `GET /api/v1/secop/sources`, `AdministracionPage.tsx` |
| HU-B009 | Ingerir SECOP | conectada | `tendersService.ts`, `ExplorarPage.tsx`, `packages/backend/src/secop/*` |
| HU-B010 | Módulos por país | cableada ahora (bandera CO) | `AdministracionPage.tsx` parámetros; sin adaptadores extra |
| HU-B011 | Monitoreo automático | conectada | poller 60s, cron `/secop/sync`, `GET /secop/status` |
| HU-B012 | Normalizar fuentes | conectada (SECOP) | `packages/backend/src/secop/mapper.ts` |
| HU-B013 | Detectar cambios | cableada ahora | `GET /secop/processes/:id/changes`, `GET /secop/signals`, `AlertasPage.tsx` |
| HU-B014 | Calidad de ingesta | cableada ahora | `GET /secop/status`, `GET /secop/sync-history`, Admin fuentes |
| HU-C015 | Buscar por texto | conectada | `ExplorarPage.tsx` → `/secop/processes?q=` |
| HU-C016 | Filtrar oportunidades | conectada | chips + query SECOP |
| HU-C017 | Guardar búsqueda | cableada ahora (local) + bloqueada Dataverse | `tendersService.saveSearch`, FlowHost |
| HU-C018 | Alertas de coincidencias | bloqueada por credencial | señales SECOP operativas; matching empresarial = Dataverse |
| HU-C019 | Alertas de cambios/adendas | cableada ahora | `/secop/signals` + `/processes/:id/changes` |
| HU-C020 | Priorizar por urgencia | cableada ahora | `AlertasPage.tsx` |
| HU-C021 | Silenciar y reactivar | cableada ahora (local) | `alertsService.ts` |
| HU-D022 | Calcular encaje | cableada ahora (motor determinista) + bloqueada Copilot/Dataverse | `POST /assessments`, `assessmentsService.ts` |
| HU-D023 | Bandeja priorizada | cableada ahora | `CalificacionPage.tsx` |
| HU-D024 | Explicar recomendación | bloqueada por credencial | Copilot fail-closed; expediente no inventa análisis |
| HU-D025 | Recalcular encaje | cableada ahora | `assessmentsService.recalc` → motor; persistencia Dataverse 503 |
| HU-D026 | Comparar oportunidades | conectada (lote SECOP) | FlowHost compare-tenders |
| HU-D027 | Interés o descarte | cableada ahora + bloqueada Dynamics | `decisionsService.ts` |
| HU-D028 | Asignar analista | cableada ahora (local) | FlowHost assign-owners |
| HU-E029 | Inventariar documentos | conectada (SECOP) / bloqueada SharePoint | `documentsService.ts`, `DocumentosProcesoPage.tsx` |
| HU-E030 | Descarga segura | bloqueada por credencial | Graph/SharePoint 503; URLs SECOP solo si el host es autorizado |
| HU-E031 | Versionar documentos | bloqueada por credencial | SharePoint; SECOP no es histórico completo |
| HU-E032 | Extraer texto | bloqueada por credencial | Copilot AG-04 |
| HU-E033 | Visualizar con citas | cableada ahora (UI) + bloqueada Copilot | `EvidenceViewer.tsx` |
| HU-E034 | Marcar revisados | cableada ahora (local) | `documentsService.markReviewed` |
| HU-E035 | Retención documental | cableada ahora (parámetro UI) | Admin parámetros |
| HU-F036 | Clasificar documentos | bloqueada por credencial | Copilot/SharePoint |
| HU-F037 | Extraer requisitos | bloqueada por credencial | Copilot; matriz local no se afirma como extracción |
| HU-F038 | Extraer fechas | conectada (campos SECOP) | mapper + expediente |
| HU-F039 | Extraer presupuesto | conectada (campos SECOP) | mapper + `RichMoney` |
| HU-F040–F044 | Evaluar criterios | cableada ahora (determinista/local) + bloqueada Copilot | `CalificacionPage.tsx`, `scoring.ts` |
| HU-F045 | Matriz de cumplimiento | cableada ahora (local) + bloqueada Dataverse/Copilot | `MatrizPage.tsx` |
| HU-G046 | Recomendación BID/NO BID | bloqueada por credencial | no se publica análisis de agente |
| HU-G047 | Registrar decisión | cableada ahora + bloqueada Dataverse | `decisionsService.record` (borrador local si 503) |
| HU-G048–G052 | Aprobaciones, bitácora, escalaciones, línea base | cableada ahora (UI local) + bloqueada Dataverse | `DecisionPage.tsx` |
| HU-H053–H060 | Preparación y paquete | cableada ahora (UI local) + bloqueada Dynamics/SharePoint | `PreparacionPage.tsx`, `PreparacionProcesoPage.tsx` |
| HU-I061 | Crear oportunidad Dynamics | cableada ahora + bloqueada por credencial | `opportunitiesService.create` → `/opportunities/from-tender` 503 |
| HU-I062–I070 | Duplicados, mapa, cuenta, sync, BPF, cierre, reconciliar | bloqueada por credencial | `Dynamics365Client`, `OportunidadesPage.tsx` |
| HU-J071 | Crear tareas Dynamics | cableada ahora + bloqueada por credencial | `tasksService.save` → `/tasks` 503; sin `dynamicsTaskId` falso |
| HU-J072–J077 | Checklist, asignación, fechas, vencidas, evidencia, carga | cableada ahora (local) + bloqueada Dynamics | `TareasPage.tsx` |
| HU-K078 | Aislar por empresa | cableada ahora (API 403) + bloqueada Entra | `handler.ts` companies, selector demo |
| HU-K079 | OAuth de integración | bloqueada por credencial | Entra unconfigured |
| HU-K080 | Privilegios Dataverse | bloqueada por credencial | `domain/permissions.ts` |
| HU-K081 | Auditar cambios | cableada ahora (UI local) | Admin auditoría |
| HU-K082 | Proteger sensibles | cableada ahora | API no loguea token; front no muestra secretos |
| HU-K083 | Consentimiento de fuente | cableada ahora | Admin fuentes |
| HU-K084 | Parámetros por ambiente | cableada ahora | `GET /admin/settings` |
| HU-K085 | Errores y reintentos | cableada ahora | Service Bus unconfigured; UI de 503 |
| HU-L086 | Embudo | cableada ahora | `/analytics` + Panorama/Analítica; Dynamics en cero |
| HU-L087 | Precisión de recomendaciones | bloqueada por credencial | sin evaluaciones Copilot reales |
| HU-L088 | Monitorear integraciones | conectada | `GET /admin/integrations` → Admin integraciones |
| HU-L089 | Niveles de servicio | cableada ahora (propuesta UI) | parámetros |
| HU-L090 | Pruebas de regresión | conectada | `packages/backend` + `frontend` vitest |
| HU-L091 | Accesibilidad | cableada ahora (parcial) | drawers, chips, `AccessibilityDock` |
| HU-L092 | Versiones y despliegues | cableada ahora | frontend 1.1.0; pipeline Microsoft pendiente |
| HU-M093–M098 | Agentes Copilot (ORQ + AG-01…05) | bloqueada por credencial | `GET /agents`, `POST /agent-executions`, `CopilotPage.tsx` |
| HU-M099–M104 | Herramientas, contratos, async, gobierno, DLP, calidad IA | bloqueada por credencial | gateway fail-closed; no se finge ejecución |
| HU-N105 | Modelo maestro Dataverse | bloqueada por credencial | tablas `tno_` documentadas; API 503 |
| HU-N106 | Interfaz web + API de negocio | conectada | Vite/React + `/api/v1` |
| HU-N107 | Integración idempotente Dynamics | bloqueada por credencial | cliente listo, sin credenciales |
| HU-N108 | Jerarquía SharePoint | bloqueada por credencial | Graph fail-closed |
| HU-N109 | Aislamiento multiempresa | cableada ahora (API) + bloqueada Entra/Dataverse | `x-company-id` |
| HU-N110 | Ambientes y despliegues | no aplica (operación) | docs `VERCEL_DEPLOYMENT.md` / `AZURE_DEPLOYMENT.md` |
| HU-N111 | Alertas, monitoreo, reconciliación | cableada ahora (SECOP) + bloqueada Dynamics | `/secop/signals`, `/admin/integrations` |
| HU-N112 | Supabase futuro | no aplica | ADR-05: no activado |

## Superficies honestas

Sin credenciales Microsoft el front muestra `desconectada` / `integration_unconfigured` y no inventa GUID Dynamics ni respuestas de Copilot. SECOP en vivo gana en Explorar, Procesos, expediente y documentos de proceso cuando la API responde.
