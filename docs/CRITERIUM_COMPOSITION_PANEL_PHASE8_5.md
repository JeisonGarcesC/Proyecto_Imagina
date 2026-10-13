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

- PASÓ: `test/critteriumCompositionPanel.test.js`, 7/7. Se actualizó una expectativa desfasada para incluir `missingFrames: 0`, campo ya presente en el modelo.
- PASÓ: harness Electron `phase84-composition.cmd` con clics nativos y lectura DOM/API: estado vacío, carga inicial de tres secuencias con seis módulos y seis frames, selección panel→3D y 3D→panel, agregar, duplicar y quitar módulo, alinear, conectar, seleccionar marcador 3D, desconectar y Undo/Redo de desconexión (0→1→0). Las capturas `phase84-composition.png` y `phase84-composition-edited.png` fueron inspeccionadas visualmente. Esto es validación instrumental, no prueba manual humana.
- PASÓ: lint dirigido sobre `CriteriumPanel.jsx`, `CritteriumCompositionPanel.jsx`, `critteriumComposition.js`, `historyManager.js`, `ThreeCanvas.jsx` y `App.jsx`, sin errores ni avisos. Se eliminó una dependencia obsoleta en el efecto de inicialización de `CriteriumPanel`.
- PASÓ: `npm run build` y `git diff --check` en la validación final de esta fase.
- FALLÓ fuera de CRITERIUM: `npm test` obtuvo 344/375 pruebas correctas y 31 fallidas: 1 carga de KONCISA, 28 LINK y 2 LOCKERS. Ninguna falla listada corresponde a CRITERIUM. La prueba focal del panel no forma parte del script `npm test` y se ejecutó por separado.
- PENDIENTE: escenario exacto de dos secuencias de 3+2 módulos y cinco frames con una conexión; el harness ejecutó tres secuencias de 2+2+2, y posteriormente 3+2+2.
- PENDIENTE: guardar, cerrar y reabrir por la interfaz, con comparación de IDs, transformaciones y relaciones. También comparación instrumental de BOM y cotización antes y después de reabrir.
- PENDIENTE: duplicación inversa de conexión, secuencias o frames faltantes en Electron, organizar/mover grupo con historia, lista larga, estados de error y recorrido manual humano de UX.

## Limitaciones

La selección de conexiones continúa siendo panel→3D; no existe recorrido inverso. El callback de historial informa acciones CRITERIUM, pero cambios que no pasen por el historial ni por carga/limpieza App no pueden refrescar el panel automáticamente sin una API de notificación adicional. Los resultados históricos documentados para Fase 8.4 no se tratan como validación de esta fase.

## Validación Fase 8.5.2

**Escenario Electron instrumentado:** desde la interfaz se creó un `CRITERIUM_SYSTEM` con dos secuencias de 3 y 2 módulos. Se movió una secuencia y reordenó un slot mediante la API existente antes de conectar los extremos. Quedaron 2 secuencias, 5 módulos, 5 frames y 1 conexión `LINEAR`. Se guardó mediante el botón **Archivo → Guardar** y se abrió el JSON en una ventana Electron nueva por la entrada de archivo de **Abrir**. La selección no se usó para inicializar el panel. Los clics fueron eventos nativos Electron; las lecturas y la carga del archivo mediante DevTools fueron instrumentales, no interacción manual humana.

| Verificación | Estado | Evidencia y límite |
| --- | --- | --- |
| Inicialización y contadores | PASS | Panel visible sin selección tras la carga: 2 secuencias, 5 módulos, 5 frames, 1 conexión. |
| IDs y composición | PASS | Comparación antes/después de `systemId`, orden y IDs de secuencias, `slotId`, `moduleId`, `frameId`, `frameInstanceId`, posiciones y cuaterniones de slots, y transformaciones exportadas del sistema y las secuencias. |
| Conexión | PASS | Mismo `connectionId`, extremos, puntos y tipo antes/después. |
| BOM | PASS | Igualdad completa de `getCritteriumOfficeSummary()` antes/después, con filas, códigos, cantidades, descripciones, materiales, acabados y diagnósticos. |
| Cotización | PASS | Se ejecutó **Cotización** y se descargó el JSON comercial antes y después. Los documentos coincidieron excluyendo `generatedAt`; estado `CONFIGURATION_COMPLETE`, tres ítems y dos diagnósticos informativos. |
| Historial de carga | PASS | `canUndoHistory` y `canRedoHistory` quedaron falsos al reabrir, antes de nuevas acciones. |
| Selección posterior | PASS | Clics de panel para sistema, secuencia y frame reflejaron el estado seleccionado. La selección 3D→panel después de reabrir no se repitió. |
| Desconexión posterior | PASS | Tras reabrir: desconectar 1→0, Undo 0→1, Redo 1→0. |
| Agregar módulo conservando conexión | NOT_SUPPORTED | El flujo existente devuelve «Desconecte primero el extremo afectado.» al intentar crecer la secuencia conectada. No se cambió esa protección espacial. La prueba 5→6→5 con la misma conexión queda sin ejecutar. |
| Rotación con conexión, lista larga, revisión visual humana | PENDING | No se ejecutaron en esta fase. |

El harness reproducible es `electron/phase85-2-persistence.cjs`. La prueba confirma que el JSON descargado por la interfaz se restaura en una ventana nueva y que el panel se reconstruye sin selección. No constituye cierre completo de Fase 8.5 mientras el requisito de editar una secuencia conectada y los puntos pendientes sigan sin comprobarse.

Verificaciones finales: prueba focal de composición 7/7; `npm test` 344/375, con los mismos 31 fallos externos (KONCISA 1, LINK 28, LOCKERS 2); `npm run build` pasó; lint dirigido pasó; `git diff --check` pasó. No se añadieron imports de `src/mepal/multiple` en CRITERIUM. Durante esta validación aparecieron cambios ajenos en KONCISA y archivos XML de precios; no se editaron como parte de Fase 8.5.2.
