# CRITERIUM — Fase 8.6: edición modular conectada

## Problema y causa

El bloqueo «Desconecte primero el extremo afectado» protegía conexiones cuyos puntos físicos podrían cambiar al reconstruir una secuencia. La conexión `LINEAR` o `DEG_90` guarda `sourcePointId` y `targetPointId` de junctions terminales. Cada punto terminal se resuelve desde un `frameId` y un lado `START` o `END`; el slot asociado conserva `slotId` y `moduleId`. El índice del slot no es identidad de conexión.

La geometría actual sólo ofrece terminales físicos en los extremos de cada secuencia. Si C está conectado en `TERMINAL_END` y se agrega D después de C, C pasa a ser intermedio. Mantener `C ↔ otra secuencia` requeriría un anclaje físico intermedio no documentado. Por ello la operación sigue bloqueada y muestra el extremo, frame, secuencia y conexión afectados. No se reasigna la conexión a D.

## Comportamiento implementado

La edición por el extremo opuesto está permitida cuando conserva el mismo frame terminal y la conexión continúa válida espacialmente. La operación usa el editor de slots y el historial existentes. Después de reconstruir, se comprueba la conexión con `collectCritteriumSpatialDiagnostics`; si aparece un diagnóstico nuevo, se revierte toda la operación y se informa el ID de la conexión y la causa espacial. El rollback conserva ahora la posición de la secuencia entre los hijos de `CRITERIUM_SYSTEM`, igual que una reconstrucción exitosa.

| Operación | Resultado con conexión en C final |
| --- | --- |
| Agregar D después de C | Bloqueada: C dejaría de ser terminal. |
| Insertar X después de C | Bloqueada por cambio de terminal. |
| Insertar X antes de C | Se valida la posición final; se bloquea si separa los puntos físicos. |
| Eliminar C o reordenarlo fuera del extremo | Bloqueada; la conexión no se transfiere al vecino. |
| Duplicar C después de C | Bloqueada; el duplicado no recibe la conexión. |
| Eliminar B con C conectado | Se valida la posición final; se bloquea si separa los puntos físicos. |
| Agregar, reordenar, duplicar o eliminar en el lado libre de la otra secuencia | Permitido cuando el frame terminal conectado sigue siendo el mismo y el diagnóstico espacial permanece vacío. |

## Identidad, persistencia e historial

`slotId`, `moduleId` y `frameId` se conservan en los módulos existentes; un duplicado obtiene IDs nuevos. La conexión conserva `connectionId` y el punto terminal del frame conectado. Cada operación aceptada registra una acción de historial; los rechazos no dejan un cambio parcial. En Electron, crecer por el extremo libre dio 5→6 módulos, Undo 6→5 y Redo 5→6 con la misma conexión y los mismos IDs al rehacer. El JSON se guardó con **Archivo → Guardar** y se cargó en una ventana nueva; coincidieron los IDs, transforms, composición y conexión.

## BOM y cotización

El crecimiento aceptado añadió un marco al BOM; Undo lo retiró y Redo lo restauró. Reordenar dejó iguales códigos, descripciones, cantidades, materiales y acabados; duplicar y después eliminar por el lado libre devolvió el BOM a su firma comercial previa. Las cotizaciones JSON antes y después de guardar/cargar coincidieron excluyendo `generatedAt`. No se modificaron los resolvers de BOM ni cotización.

## Pruebas

`test/critteriumConnectedModuleEditing.test.js` cubre identidad del terminal y rechazo seguro para agregar, insertar, eliminar, reordenar y duplicar, más crecimiento por el extremo opuesto. `electron/phase86-connected-edit.cjs` usa clics nativos para crear, conectar, intentar agregar en el extremo ocupado y crecer por el libre; usa API instrumental para operaciones adicionales, Undo/Redo y lectura de estructura; guarda por la interfaz y abre el archivo en otra ventana. Verificó contador, persistencia, selección desde el panel del frame conectado y su `instanceId`, BOM, cotización, punto conectado y ausencia de diagnósticos espaciales. No es una prueba manual humana.

## Limitaciones

No existe un anclaje físico lateral o intermedio validado para conservar una conexión en C después de agregar D detrás de C. Insertar antes del extremo conectado o eliminar un módulo anterior también puede desplazar ese extremo; se rechaza si la conexión se separa. No se creó una geometría nueva ni se modificó Smart Snap. La selección física 3D→panel después de estas operaciones y todos los escenarios de orientación no se verificaron manualmente en esta fase.

## Resultado de validación

- PASS: 15/15 pruebas focales de composición, slots y conexiones.
- PASS: Electron instrumentado: extremo final bloqueado con motivo específico; extremo inicial conserva la conexión al crecer por el opuesto; Undo/Redo 5→6→5→6; reordenar, duplicar y eliminar por el lado libre; persistencia, BOM y cotización tras reabrir.
- PASS: lint dirigido y `git diff --check`.
- `npm test`: 344/375; 31 fallos ya presentes fuera de CRITERIUM (KONCISA 1, LINK 28, LOCKERS 2).
- PASS: `npm run build`.
