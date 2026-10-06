# CRITERIUM Fase 4.1: slots modulares

## Diagnóstico inicial

Antes de esta fase, `CRITTERIUM_8_SEQUENCE` guardaba `frameIds`, frames, junctions y un grafo de conexiones físicas. No guardaba posiciones modulares con identidad propia. El configurador calculaba posiciones con los anchos comerciales al crear, pero la reconstrucción posterior volvía a leer las transformaciones de los frames. Las operaciones existentes agregaban o retiraban frames físicos y la retirada no funcionaba dentro de `CRITERIUM_SYSTEM`. Los `slotId` previos de CRITERIUM son espacios para tiles **dentro de un frame**; tienen otra propiedad y otra escala.

## Contrato

La secuencia es propietaria de `sequence.slots`. Cada slot conserva `slotId`, `sequenceId`, `index`, `position` local `[x,y,z]`, `orientation` en radianes, `widthCm`, `depthCm`, `moduleType`, `moduleId`, `frameId`, `status` y `transformOverride`. `slotId` y `moduleId` no son índices ni IDs del frame. Los proyectos anteriores obtienen IDs deterministas por `sequenceId` y `frameId` al reconstruirse; los slots nuevos reciben UUID. `index` puede cambiar sin cambiar la identidad.

`sequence.slotConnections` contiene únicamente relaciones lógicas entre slots consecutivos. `sequence.graph` y `sequence.junctions` siguen representando conexiones y kits físicos entre frames. `CRITERIUM_SYSTEM.connections` sigue representando conexiones entre secuencias. Los tres contratos no se mezclan.

## Composición y edición

Al crear una secuencia, `prepareCritterium8Sequence` reconcilia sus frames con los slots de la secuencia anterior. El orden previo de slots tiene prioridad sobre el orden de los meshes. El LeftPanel permite agregar, insertar, duplicar, eliminar, reordenar y cambiar el ancho comercial de un módulo. Antes de tocar la escena, se valida la secuencia comercial completa mediante el configurador CRITERIUM existente. La disposición utiliza el ancho comercial de cada slot y la orientación del primero, manteniendo el extremo inicial fijo. Eliminar compacta la secuencia y exige conservar al menos dos frames físicos.

Agregar, insertar y duplicar crean un frame real mediante `createCritterium8Instance`. La duplicación conserva la configuración comercial y crea nuevos IDs físicos y lógicos. Eliminar retira el frame comercial. Reordenar solo mueve los frames. Configurar ancho, altura o tipo de frame reconstruye ese frame con el mismo `frameId` y `instanceId`; se rechaza un cambio que descarte tiles. Organizar restablece posiciones paramétricas y limpia overrides. Se reconstruyen los junctions con los resolvers existentes. Los overrides de junctions se conservan cuando sus endpoints siguen existiendo.

## Movimiento, Smart Snap y sistema

Un movimiento manual del frame se guarda como `transformOverride` local al serializar o editar. El slot no desaparece. Si un override impide una reconstrucción conectada, la operación se rechaza. Durante el arrastre individual del frame, el marcador muestra su slot lógico y al soltar dentro de 5 cm el frame vuelve a él. Los puntos terminales de Smart Snap siguen saliendo de los terminales reales de los frames; ahora exponen `slotId` para identificar el módulo extremo. El movimiento de una secuencia o sistema conserva la posición local de sus slots. Al cambiar el extremo de una secuencia conectada, se remapea el ID del punto terminal según START/END y se recalculan diagnósticos espaciales; una conexión físicamente separada queda diagnosticada.

## Persistencia y BOM

Los slots y sus conexiones se serializan dentro de la secuencia. Al abrir, se restauran desde ese mismo dato. Si falta un frame de una secuencia modular, se conserva una raíz de secuencia incompleta, el slot queda `MISSING_FRAME` y se agrega `CRITTERIUM_MODULE_MISSING_FRAME`. No se fabrican piezas ni junctions comerciales ausentes. Las operaciones modulares se bloquean sobre una secuencia incompleta hasta repararla. Los proyectos antiguos sin slots conservan su validación de carga anterior.

El BOM sigue recorriendo frames y junctions físicos registrados. Un slot lógico no aporta filas. Agregar o eliminar un frame cambia el BOM; reordenar, mover y conectar no lo hacen.

## Historial

Las acciones `CRITTERIUM_MODULE_SLOT_ADD`, `INSERT`, `DUPLICATE`, `REMOVE`, `REORDER` y `CONFIGURE` guardan un estado antes y después con frames, transforms locales, composición, padre del sistema y conexiones espaciales. Cada pulsación crea una sola acción. Undo/Redo reconstruye la secuencia con los constructores existentes y recupera los mismos objetos físicos e IDs.

## Validación y límites

Las pruebas automatizadas comprueban el modelo, la identidad, el espaciado, la reconciliación, el override, la persistencia, los puntos Smart Snap y el BOM. La interacción visual, el arrastre manual y los atajos Undo/Redo dentro de Electron requieren prueba manual. Una secuencia restaurada con frames faltantes se conserva para diagnóstico; los junctions de esa secuencia no se reconstruyen hasta reparar los frames. El configurador solo ofrece frames CRITERIUM existentes, sin nuevos tipos ni códigos comerciales.
