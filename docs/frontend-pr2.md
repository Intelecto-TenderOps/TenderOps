# Frontend completo de TenderOps · PR 2

## Actualización visual: vidrio azul y filtros laterales

El diseño posterior utiliza superficies translúcidas, desenfoque, bordes iluminados y sombras suaves en tonos azules, incluyendo acceso, navegación, tablas, formularios y diálogos. `glass.css` centraliza esta capa y conserva alternativas sin transparencia/desenfoque; los estados de alerta mantienen sus colores semánticos y texto.

`FilterPanel` unifica oportunidades, requisitos, checklist, tareas, vigencia documental, alertas, indicadores, trabajos y auditoría. El botón Filtros abre un diálogo lateral modal con desplazamiento propio. La selección aplicada se muestra como etiquetas removibles y contador; Limpiar todos restaura la vista. En oportunidades, Buscar procesos valida y aplica los criterios a la URL, conservando enlaces y búsquedas guardadas. Los demás módulos actualizan los resultados al seleccionar y permiten cerrar con Ver resultados.

Escape, cierre explícito y devolución del foco utilizan el diálogo nativo. El fondo queda bloqueado mientras está abierto; el panel ocupa el ancho disponible en móvil. Las selecciones de empresa/función y la selección del proceso sobre el cual operar en Dynamics mantienen su comportamiento, porque definen contexto de trabajo.

Verificación del rediseño: compilación y lint correctos, 13 pruebas unitarias, siete recorridos autónomos y once integrados aprobados. Las pruebas nuevas recorren los filtros de cada módulo, la eliminación de etiquetas, limpieza total, URL, Escape, devolución de foco y 320 px. Se inspeccionaron capturas de escritorio y panel móvil. No se ejecutó lector de pantalla ni se declara certificación WCAG.

El alcance cambia por solicitud de la usuaria: adelantar la interfaz de los cinco incrementos al PR 2. El backend del PR 1 se conserva. Esta entrega permite recorrer y probar la aplicación completa; no declara terminadas las integraciones ni los criterios de aceptación de las 92 historias.

## Cómo recorrerlo

Desde `frontend`: `npm ci`, `npm run dev` y abrir `http://127.0.0.1:5173/demo`. No requiere API, cuenta ni credenciales. También se puede compilar con `npm run build` y servir `dist` con fallback SPA. `vercel.json` define build y rutas, sin publicar nada ni incluir credenciales. Una instalación estática solo ofrece la demostración; el acceso real requiere servir la aplicación junto al BFF HTTPS del PR 1.

La franja de demostración permanece visible. Dos empresas ficticias y siete vistas de función permiten explorar permisos; cambiar de función no es autenticación. Los datos viven en memoria y se reinician al recargar. Las descargas contienen texto/JSON sintético, nunca documentos reales. La fecha de referencia del conjunto es el 22 de octubre de 2026.

Recorrido sugerido: Mi bandeja → Oportunidades → expediente → Documentos → Matriz → Evaluación → Comité → Preparación → Tareas → Dynamics 365. Fuentes, alertas, búsquedas guardadas, vigencia documental, indicadores, operación, auditoría y configuración completan la navegación. El perfil empresarial conserva empresa, capacidades, experiencia, evidencia, finanzas, cobertura, reglas y miembros.

## Comportamientos disponibles

- Filtros por texto sin acentos, fuente, región, modalidad, etapa, fechas y presupuesto; validación de rangos, orden, paginación, búsqueda guardada y comparación de hasta diez procesos. Los importes conservan precisión decimal mediante cadenas/BigInt.
- Inventario documental con estado de seguridad, versiones, adendas y texto de ejemplo. Las citas identifican documento, versión, localizador y fragmento verificable. La carga valida firma, extensión, tamaño y hash en el cliente; registra metadatos en cuarentena, sin subida ni análisis antivirus real. Un archivo restringido no habilita vista ni descarga.
- Matriz con estados Cumple, No cumple, Parcial, Desconocido y No aplica, evidencia, acción, confianza y referencias. La evaluación explica bloqueos y datos faltantes; no convierte un puntaje en decisión ni calcula solvencia a partir de datos inventados.
- Aprobaciones por disciplina, BID/NO BID motivado, excepciones, comentarios como texto plano, escalaciones y línea base descargable. La adenda conserva el original e invalida aprobaciones. El BID de prueba exige resolver bloqueos y aprobaciones vigentes.
- Checklist con dependencias, responsable, evidencia, nota y fechas manuales. Las tareas vinculadas reflejan su estado. El paquete de prueba es un manifiesto JSON, no un ZIP listo para presentar.
- Dynamics simula resolución de cuenta, vinculación idempotente, conflictos, conciliación y resultado comercial. No crea registros en CRM. El mapeo declara campos manuales y propiedad propuesta.
- Preferencias de avisos, silencio y zona horaria; revisión de vigencia; retención propuesta y conservación legal; parámetros por ambiente sin secretos; trabajos con progreso, error, correlación y reintento transitorio; objetivos de servicio editables como propuestas sin medición acreditada.
- Indicadores distinguen distribución actual, eventos, calidad de citas y resultado comercial. Los valores se identifican como ejemplos; no se presentan como tasas reales de conversión ni precisión de producción.

## Límites de servicios y seguridad

`/app` mantiene sesión BFF, perfil y auditoría conectados a la API existente. Un módulo futuro muestra un estado explícito de servicio pendiente con enlace a `/demo`; un error de API nunca activa fixtures silenciosamente. No se guardan tokens en Zustand, localStorage ni sessionStorage. Zustand conserva exclusivamente selección de empresa, navegación y selección para comparar. React Query gestiona datos, mutaciones e invalidación por empresa/función; el cambio de empresa limpia la caché.

`workbench/repository.ts` es el adaptador efímero de demostración. Sus controles de función, versión, idempotencia y pertenencia del expediente sirven para verificar la experiencia; **no son una frontera de seguridad de producción**. El futuro BFF debe validar cada permiso y referencia de nuevo. Los contratos de comando son semánticos; no se expone un editor OData ni acceso genérico a tablas Dataverse.

Para conectar servicios: conservar consultas/mutaciones de `hooks.ts`, sustituir lectura/comandos del repositorio por endpoints tipados del BFF y aplicar los modelos de `types.ts` como referencia, validando respuestas en la frontera. El servidor deberá devolver IDs, versiones, correlación y estados persistentes. Mantener errores 401/403/404/409, carga, vacío y reintento recuperable. La matriz complementaria `requirements/frontend-coverage.csv` relaciona cada historia con su pantalla y dependencia pendiente; no modifica la aceptación del backlog original.

Persisten trabajos de backend: conectores autorizados SECOP, Blob/antivirus, OCR y extracción, evaluación reproducible, generación de archivos reales, notificaciones, Dynamics y tareas, reglas automáticas, retención efectiva, telemetría y SLO. OAuth real, application user, roles Dataverse y validación sandbox siguen fuera de esta demostración. Los identificadores públicos proporcionados por la usuaria permanecen en configuración local ignorada.

## Diseño y verificación

La interfaz extiende verde/crema del perfil: navegación lateral por trabajo diario, propuestas y gobierno; expediente con pestañas; tablas densas y estados explicados. Incluye navegación móvil desplegable, nombres accesibles, foco visible, diálogo nativo con Escape y devolución de foco, anuncios de resultado/error y desbordamiento de tablas contenido en su región. ITC no está disponible: se utilizan controles HTML propios, sin fingir esa dependencia.

Comprobaciones: `npm run lint`, `npm test`, `npm run build`, `npm run test:demo` (sin backend) y `npm run test:e2e` (API local HTTPS). La suite del PR 1 se mantiene para detectar regresiones. Los recorridos nuevos verifican navegación, empresas, roles, filtros, comentarios seguros, adendas, cuarentena, formularios, trabajos, teclado, 320 px y CSS zoom 200%. Las capturas desktop/móvil se inspeccionan visualmente. Esto no equivale a una certificación WCAG ni a pruebas de lector de pantalla o de servicios externos.

El CI ejecuta compilación, lint, pruebas unitarias, auditoría de dependencias y recorridos integrados; también ejecuta el modo autónomo sin backend. No despliega ni fusiona automáticamente.

Evidencia local del PR 2: build TypeScript/Vite y lint correctos; 13 pruebas Vitest/RTL aprobadas; nueve recorridos Playwright integrados y cinco autónomos aprobados; capturas de escritorio y móvil inspeccionadas. Se usa el pool de threads de Vitest para evitar el bloqueo de arranque de procesos fork observado en Windows. Consultar los checks del PR para la evidencia remota de cada revisión.
