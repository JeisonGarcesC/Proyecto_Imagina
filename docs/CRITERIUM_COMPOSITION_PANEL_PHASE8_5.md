# CRITERIUM — Fase 8.5: consolidación del panel de composición

## Problema inicial

La Fase 8.4 ya contaba con árbol de composición, selección y conexiones. El snapshot inicial podía permanecer vacío hasta recibir una selección o una operación, y el panel no tenía una notificación común para cambios hechos fuera de sus botones.

## Fuente de verdad

Se conserva el modelo CRITERIUM existente: `CRITERIUM_SYSTEM` mantiene secuencias y `userData.connections`; las secuencias conservan slots lógicos y contienen frames físicos. `getCritteriumStructure()` continúa entregando una proyección; el árbol React no se persiste ni genera IDs.

## Inicialización y actualización

`CriteriumPanel` lee la estructura al montar/actualizar la selección, conserva el sistema activo si existe y, de lo contrario, escoge el primer sistema disponible. El estado vacío continúa siendo válido.

`HistoryManager` admite ahora un callback opcional por acción registrada o reproducida. ThreeCanvas lo limita a acciones CRITERIUM (y creación de objetos CRITERIUM); App incrementa la revisión usada por el panel. La misma revisión se incrementa al cargar, limpiar o abrir un proyecto por las rutas App existentes. No se añade polling ni acciones nuevas al historial; el callback no es una fuente de verdad.

## Contadores y estados parciales

La composición presenta por separado secuencias, módulos, frames y conexiones. Módulos cuenta slots lógicos; frames cuenta slots con `frameInstanceId`. Los slots sin frame y las secuencias referenciadas pero ausentes se muestran como advertencias. Los diagnósticos espaciales existentes pueden marcar conexiones inválidas; si no existe diagnóstico, la vista no inventa un estado.

## Conexiones y selección

Se conserva la selección panel→marcador 3D existente y la etiqueta de tipo almacenada, incluyendo `RELATION`. La lista mantiene contador visible, estado plegable y muestra extremos numerados y diagnósticos disponibles. No se incorpora selección de conexión 3D→panel.

Sistema, secuencia y frame siguen usando las APIs de selección existentes. El frame seleccionado expande su secuencia y resalta el slot correspondiente.

## Persistencia, BOM y cotización

No se modifican serializadores, loaders, BOM ni cotización. La restauración debe volver a alimentar `getCritteriumStructure()` y el árbol derivado; el panel no calcula importes ni cantidades comerciales.

## Ergonomía

Se amplía el ancho al disponible en el contenedor, se separan los cuatro contadores, se aumenta el espacio de los controles y se distingue visualmente la sección de conexiones y los elementos incompletos.

## Pruebas añadidas

- `test/critteriumCompositionPanel.test.js`: slot sin frame, secuencia faltante, diagnóstico de conexión y conservación del tipo `RELATION`, además de la cobertura previa de orden, conteos y selección.
- `electron/phase84-composition.cjs`: asserts de contadores al agregar, duplicar y eliminar un módulo; clic nativo para desconectar y lectura DOM/API instrumental para comprobar relación, slots y frames resultantes.

## Estado de validación

- PENDING: carga inicial y refresco por historial implementados en código, sin ejecución de la aplicación.
- PENDING: nuevas pruebas unitarias; no ejecutadas por solicitud.
- PENDING: harness Electron ampliado; no ejecutado. Sus clics son eventos nativos Electron; las lecturas de estado usan instrumentación DOM/API y no equivalen a prueba manual humana.
- PENDING: build, lint dirigido, `npm test` y `git diff --check`; omitidos por solicitud de evitar comprobaciones que interrumpan el flujo.
- PENDING: recorrido guardar/cerrar/abrir de Fase 8.5 y comparación de IDs, BOM y cotización después de restaurar.

## Limitaciones

La selección de conexiones continúa siendo panel→3D; no existe recorrido inverso. El callback de historial informa acciones CRITERIUM, pero cambios que no pasen por el historial ni por carga/limpieza App no pueden refrescar el panel automáticamente sin una API de notificación adicional. Los resultados históricos documentados para Fase 8.4 no se tratan como validación de esta fase.
