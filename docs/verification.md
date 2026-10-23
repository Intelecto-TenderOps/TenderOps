# Evidencia del PR 1

Fecha: 22 de octubre de 2026, America/Bogota. Entorno local Windows; .NET 10.0.402, Node 26.10.0. Datos sintéticos de dos empresas. No hay validación real de Entra, Dataverse ni Azure en esta evidencia.

| Verificación | Resultado |
| --- | --- |
| Build .NET, API/BFF y worker | Correcto, sin advertencias ni errores |
| xUnit dominio/API/contrato | 20 casos aprobados: aislamiento, permisos negativos, revocación, CSRF, cookies, ETag, comandos concurrentes/duplicados, rollback local, pérdida de respuesta tras commit, leases, inbox, aprobación y segregación financiera, errores internos de changeset |
| Build frontend TypeScript/Vite | Correcto |
| ESLint | Correcto |
| Vitest + React Testing Library | 3 casos aprobados: validación/foco/decimal exacto, lectura/vacío y error recuperable |
| Playwright Chromium | 4 recorridos aprobados: perfil, cierre de sesión, aprobación entre dos identidades, 320px, teclado y capturas |
| Inspección de capturas | Desktop 1365px y móvil 320px inspeccionados; no se observó desbordamiento. CSS zoom 200% comprobado automáticamente; no sustituye zoom nativo ni lector de pantalla |
| npm audit | Cero vulnerabilidades tras actualizar dependencias |
| Restauración NuGet con auditoría | Correcta, sin alertas de vulnerabilidad en las versiones finales; lockfiles registrados |
| Bicep main + parámetros Dev/Test/Prod | Compilación local correcta, sin despliegue |
| Matriz | 92 historias; 67 P0, 24 P1, una P2. Etapas 18/16/21/28/9 |
| Entra/Dataverse sandbox, importación administrada, Azure RBAC y dos réplicas | No ejecutado; acceso/configuración pendientes |
| Contenedores y pipeline GitHub | Definidos; consultar checks del PR para ejecución remota real |

Los 20 casos son evidencia local. La atomicidad del doble y la forma de un changeset HTTP no demuestran la transacción real Dataverse/los permisos del application user. Las capturas y pruebas de teclado no acreditan conformidad WCAG completa.

## Estado de las 18 historias de esta etapa

| HU | Implementación local | Pendiente para aceptación |
| --- | --- | --- |
| A001 | Empresa, identidad natural, membresía inicial y aislamiento | Owner teams/rol y carrera en sandbox |
| A002 | Capacidades con vigencia/estado, versiones e historial | Consumo de versiones en evaluación en etapa 3; validación Dataverse |
| A003 | Experiencias y referencias de evidencia con decimal exacto | Blob/carga segura/descarga real en etapa 2; metadatos reales |
| A004 | Borrador, aprobación por otra persona, inalterabilidad y selección de aprobados vigentes | Seguridad de campos y aprobación en sandbox |
| A005 | Inclusiones/exclusiones por país/subdivisión/fecha | Uso explicable en evaluación en etapa 3 |
| A006 | Reglas con vocabulario cerrado, prioridad/vigencia y publicación inalterable | Aplicación determinista/citas de resultado en etapa 3 |
| A007 | Roles combinables, membresías, revocación y equipos | Matriz de privilegios Dataverse aprobada y prueba con usuarios reales |
| K078 | Autorización por empresa/recurso/referencia; caché separada | Pruebas Dataverse/Blob/colas con dos empresas reales |
| K079 | Adaptador con certificado externo y sesión Entra separada | Tenant, permisos, certificado/application user configurados y login real |
| K080 | Matriz BFF, esquema y contrato de mínimo privilegio | Crear/aprobar rol y perfiles de campo; no se consideran implementados por documentación |
| K081 | Auditoría funcional en transacción; payload financiero redactado según permiso | Habilitar/verificar auditoría nativa y retención en Dataverse |
| K082 | Finanzas separadas por permiso, cookie BFF, logs seguros, esquema de payload secured | Perfiles de campo, clasificación/DLP aprobadas y comprobación real |
| K083 | Registro de política/versión/base autorizada | Conector/kill switch de fuente se verifican en etapa 2; aprobación jurídica real |
| K084 | Configuración externa y recursos por entorno | Metadatos/publisher, solución real administrada y referencias de secretos |
| K085 | Errores seguros, política transitoria, idempotencia, outbox/inbox y recuperación de lease | Registro persistente de intentos, operación DLQ/replay y jobs con procesadores reales |
| L088 | CorrelationId y telemetría OTLP del BFF; logs seguros del worker | Colector/Application Insights, métricas de colas/alertas/tablero y umbrales medidos |
| L090 | Suites locales y quality gates CI | Regresión real de Dataverse y resultado remoto del pipeline |
| L092 | Versiones fijadas, lockfiles, contenedores, exportador de solución y Bicep | Exportar/importar solución real y ensayar restauración/rollback |

Se mantiene el PR en borrador. Las dependencias externas no convierten estos criterios en cumplidos ni autorizan avanzar al prompt 2. La base de jobs es solo contrato y consulta de estado; no se responde 202 simulando un trabajo que no puede procesarse. No hay IA ni integración funcional con oportunidades.
