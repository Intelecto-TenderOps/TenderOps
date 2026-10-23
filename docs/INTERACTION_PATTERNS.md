# Patrones de interacción

## Navegación derecha

El menú global vive solo en el extremo derecho (`RightSidebar`). Es flotante, compacto por defecto y se expande al pasar el cursor o al fijarlo. Los submenús se abren hacia la izquierda. En móvil se despliega desde la derecha y no convive con un flujo abierto.

## Paneles laterales

Toda operación usa `FlowDrawer`. Composición de escritorio:

`CONTENIDO | FLUJO | MENÚ DERECHO`

El panel no cubre el menú. Escape cierra si no hay cambios sucios; si los hay, `UnsavedChangesGuard` pide confirmación. El foco vuelve al control que abrió el flujo.

## Flujos de varios pasos

`FlowStepper` avanza dentro del mismo panel. Ejemplo: registrar experiencia (datos, cliente, valores, documentos, revisión). No se abre un panel sobre otro.

## Detalle contextual frente a flujo

El detalle de lectura se actualiza al seleccionar una fila. Si se abre un flujo, el detalle puede ocultarse y se restaura al cerrar.

## Etiquetas removibles

Filtros activos y selecciones múltiples usan el mismo sistema. Quitar una etiqueta actualiza el estado y los resultados sin reabrir el panel. «Limpiar todo» vacía la selección. Las etiquetas pendientes (antes de Aplicar) se distinguen con borde discontinuo.

## Selección de tablas

`SelectedItemsBar` muestra el conteo, chips individuales y acciones por lote (comparar, asignar, clasificar, exportar), siempre en un flujo lateral.

## Adaptable

Escritorio 1440/1280: listado + detalle + menú. 1024: el flujo puede sustituir el detalle. 768/390: el flujo ocupa el área útil.

## Estados

Cada flujo contempla carga, error, vacío y validación junto al campo.
