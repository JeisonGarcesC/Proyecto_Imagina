# Fase 2: CRITERIUM_SYSTEM

## Jerarquía y contratos

`CRITERIUM_SYSTEM` es un `THREE.Group` superior que contiene referencias físicas a raíces `CRITTERIUM_8_SEQUENCE_ASSEMBLY` ya existentes. Una secuencia contiene los frames `CRITTERIUM_8_ASSEMBLY` y sus junctions; cada frame conserva sus partes `CRITTERIUM_8_PART`. `Group.attach` cambia la jerarquía sin crear otra instancia ni alterar la posición de mundo al establecer o retirar la relación.

| Nivel | ID | Transformación |
| --- | --- | --- |
| Sistema | `systemId` | Local respecto a la escena. Mueve todas sus secuencias. |
| Secuencia | `sequenceId` | Local respecto al sistema; su entidad se guarda con transformación de mundo para carga independiente. |
| Frame | `frameId`, `instanceId`, `assemblyId`, `groupId` | Local respecto a la secuencia; su entidad se guarda con transformación de mundo. |
| Parte y junction | `partId`, `junctionId` | Siguen perteneciendo al frame o a la secuencia. |

El sistema guarda `sequenceIds`, `connections` declarativas y `layout` como metadatos. Una conexión de sistema referencia dos secuencias y dos `junctionId` existentes; no crea ni reconstruye geometría. El resolver de encuentros CRITTERIUM sigue siendo el único responsable de sus junctions.

## Registro, selección y movimiento

El sistema se registra una vez en `partsRegistry` y tiene `excludeFromBOM`. No se agrega a `pickables`: las partes y junctions conservan los pickables existentes. `resolveCritteriumSelectionHierarchy` resuelve desde un mesh hasta parte, junction, frame, secuencia y sistema. La API de ThreeCanvas expone selección explícita por `systemId`, creación desde `sequenceId[]`, agregar, retirar, mover sistema, mover secuencia y eliminar sistema. No hay interfaz nueva en LeftPanel.

Mover la raíz cambia una sola transformación de sistema; mover una secuencia cambia únicamente su transformación local. Crear, agregar, retirar, mover y eliminar registran una acción atómica del historial global en la API. La carga usa el loader y no registra historial. La eliminación estructural desacopla las secuencias antes de retirar la raíz; no elimina frames ni junctions. La eliminación genérica de miembros de un sistema está protegida para evitar una pérdida accidental de relaciones.

## Persistencia y compatibilidad

El guardado produce entidades independientes en este orden lógico: frames `CRITTERIUM_8`, secuencias `CRITTERIUM_8_SEQUENCE`, sistema `CRITERIUM_SYSTEM`. El sistema persiste `systemId`, `sequenceIds`, conexiones, layout y transformación. El loader carga primero los frames, luego las secuencias y por último el sistema; valida que existan todas las relaciones y puntos de conexión. Si falla, deja las secuencias independientes y comunica el error. Los proyectos sin `CRITERIUM_SYSTEM` no se migran ni agrupan automáticamente.

La secuencia y el frame se guardan en coordenadas de mundo aunque estén anidados. Al cargar el sistema, `attach` restituye las transformaciones locales bajo la nueva raíz conservando el lugar visual. La reconstrucción de secuencia usa temporalmente su espacio local, incluso bajo una raíz de sistema transformada.

## Límites de esta fase

No hay Smart Snap, layout automático, editor de oficina, duplicación de secuencias ni cotización nueva. Las conexiones entre secuencias son relaciones explícitas; si una edición posterior cambia los `junctionId` referidos, la conexión debe revisarse antes de volver a guardar o abrir. Disolver una secuencia o quitar un frame que pueda dividirla requiere primero retirarla del sistema. Agregar frames conectados y reconstruir la secuencia siguen utilizando las operaciones CRITTERIUM existentes.

## Prueba manual pendiente en la aplicación

1. Crear dos secuencias con el flujo actual y anotar sus IDs de frames y junctions.
2. Crear el sistema mediante `threeApiRef.current.createCritteriumSystemFromSequenceIds([idA, idB])`.
3. Moverlo con `moveCritteriumSystemBy(systemId, { x: 1 })`; verificar ambas secuencias.
4. Mover una con `moveCritteriumSequenceBy(systemId, idA, { z: 0.2 })`; verificar que la otra permanezca.
5. Seleccionar un frame y editar una propiedad. Verificar que el sistema y la secuencia sigan seleccionables.
6. Guardar, cerrar y abrir. Verificar `systemId`, `sequenceId`, `frameId`, `junctionId`, transformaciones y posibilidad de reconectar.
7. Deshacer y rehacer una operación estructural y un movimiento; comprobar que cada gesto ocupa una acción.

La Fase 3 puede crear la interfaz de LeftPanel usando estas APIs. `duplicateSequence` necesita un contrato de creación con IDs nuevos y permanece fuera de esta fase.

## Validación final de la Fase 2

**Automatizado:** `test/critteriumSystem.test.js` cubre composición con dos secuencias existentes, identidad de los cuatro frames, jerarquía de selección, agregar/retirar/volver a agregar, eliminación sin destruir secuencias, movimientos de sistema, secuencia y frame, estabilidad de junctions, conexiones duplicadas, guardado/carga, transformación de mundo con rotación y escala, reconstrucción tras carga, códigos comerciales y rechazo de relaciones inválidas. Junto con las pruebas de interacción y persistencia de secuencias: 18/18 pasan. La comparación comercial verifica el multiconjunto de códigos de `partsDefinition` de los frames; no representa una ejecución de la pantalla de cotización.

**Revisión de integración:** las APIs de ThreeCanvas registran una única acción del historial global por creación, cambio de pertenencia, movimiento o eliminación del sistema. El loader no invoca `pushAction`. El sistema se excluye del BOM y del snapshot 2D; las entidades CRITTERIUM se cargan en orden frame → secuencia → sistema. Ningún archivo comercial de MULTIPLE, LINK, KONCISA o VETRO se modificó como parte de esta fase.

**Controles de repositorio:** `npm run build` pasa. `git diff --check` pasa. `npm test`: 326 pruebas, 297 pasan y 29 fallan en Koncisa, LINK y Lockers; esos 29 fallos ya existían antes de esta validación y no involucran CRITTERIUM. El lint de los archivos nuevos y módulos CRITTERIUM pasa; al incluir `ThreeCanvas.jsx` señala `integrationNearEdgeOutwardZ` sin uso, presente también en `HEAD`.

**Pendiente manual:** ejecutar en la aplicación el checklist anterior, especialmente selección física, Undo/Redo mediante gestos reales, guardado/cierre/apertura y comparación visual de ubicación y BOM. La prueba automatizada no sustituye estos recorridos de interfaz. No se declara cerrada esa parte hasta realizarla.
