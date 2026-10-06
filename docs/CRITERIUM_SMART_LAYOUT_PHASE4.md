# CRITERIUM 8 — Fase 4: Smart Layout espacial

## Arquitectura

`CRITERIUM_SYSTEM` sigue siendo un `THREE.Group` lógico. Contiene secuencias; cada secuencia contiene sus frames y junctions. Los módulos de `src/mepal/critterium8/system/layout/` resuelven puntos, compatibilidad, preview y transformaciones. No importan código de otras líneas. Las operaciones se integran en las APIs existentes de `ThreeCanvas` y en el historial global.

## Puntos y coordenadas

Solamente los junctions `TERMINAL` con un único `endpointRef` generan puntos para unir secuencias. El ID del punto es el ID persistente del junction. `START` y `END` corresponden a los extremos del frame de 8 cm de profundidad. Se calcula la posición mundial actual desde el centro, ancho y rotación del frame; no se usa un offset fijo ni la geometría del mesh. La dirección sale hacia fuera del frame. La normal corresponde a la cara frontal rotada. El punto incluye altura, modo de frame y profundidad para validar compatibilidad.

Three.js usa metros en los ejes `(x,y,z)`; la planta usa `(x,z)`. Las dimensiones comerciales están en centímetros y se convierten a metros al resolver extremos. Las transformaciones del sistema y la secuencia se aplican mediante la jerarquía de `THREE.Group`. El BOM se resuelve por definiciones comerciales y no lee estas coordenadas.

## Snap y reglas

- Captura inicial: 0,30 m. Vista de candidato: 0,45 m. Ambas distancias viven en la configuración espacial del sistema y tienen valores por defecto centralizados.
- La distancia se mide entre extremos terminales reales en planta. El desplazamiento propuesto es `destino - origen`; la posición final se aplica al soltar.
- `LINEAR`: direcciones opuestas y normales paralelas, con tolerancia angular de 2°. `DEG_90`: direcciones y normales perpendiculares, con la misma tolerancia.
- Deben coincidir altura, altura de proyecto, modo de frame y profundidad. Se rechazan orientaciones o dimensiones incompatibles.
- Verde significa conexión compatible dentro de captura; amarillo significa candidato compatible cercano fuera de captura; rojo significa candidato cercano incompatible. Preview no cambia la posición definitiva; el arrastre ordinario sí sigue al mouse.
- La conexión lógica conserva ID, IDs de secuencia, IDs de punto y tipo. La pareja A–B es única independientemente del orden. Un terminal ocupado no acepta otra unión espacial porque esa derivación aún no tiene una regla definida. Desconectar elimina solamente la relación.

No se generan puntos a mitad de panel, derivaciones en T o X entre secuencias: la fase actual no tiene una regla espacial y comercial inequívoca para esas uniones. Los junctions internos de cada secuencia siguen usando el resolver existente.

## Operaciones y jerarquía

LeftPanel ofrece agregar, quitar, duplicar, eliminar, alinear por eje o extremo, distribuir, rotar 90°, conectar, desconectar y organizar en línea. Un sistema seleccionado puede arrastrarse desde cualquiera de sus partes; una secuencia seleccionada se arrastra como grupo. El frame y la pieza mantienen sus rutas de edición individuales. La organización lineal encadena `END` con `START`, orienta cada secuencia a continuidad lineal y aplica la separación configurable (5 cm por defecto). Comprueba intersecciones entre huellas rectangulares de frames y rechaza una organización que las atraviese. No modifica los frames ni sus datos comerciales.

## Persistencia e historial

La entidad `CRITERIUM_SYSTEM` guarda `systemId`, IDs de secuencia, conexiones, layout, configuración espacial y transform del sistema. Cada secuencia conserva su propia entidad y transform; cada frame conserva la suya. La carga existente reconstruye dependencias en orden de frames, secuencias y sistema, sin serializar meshes. Una relación espacial restaurada que dejó de coincidir se conserva con `spatialDiagnostics`; un ID de punto inexistente sigue rechazando la entidad para evitar una relación corrupta.

Cada comando de LeftPanel captura el estado anterior y posterior en una acción del historial global. Un arrastre de secuencia, incluido snap y conexión, produce una acción; mover el sistema produce una acción. Los estados intermedios del mouse no se registran. Undo/Redo restaura transformaciones, layout y conexiones.

## Pruebas

`test/critteriumSmartLayout.test.js` cubre puntos mundiales, snap lineal, candidato fuera de captura, encuentro a 90°, rechazos por orientación y altura, conexión inversa duplicada, desconexión, alineación, distribución, rotación, layout lineal, persistencia, Undo/Redo y BOM inmutable. Se mantiene la suite de CRITERIUM de fases previas.

## Limitaciones y validación manual

La validez espacial de una conexión se verifica por extremos y dimensiones. La comprobación de intersecciones se aplica al layout lineal; esta fase no implementa un motor general de colisiones durante el arrastre ni un diseñador de oficinas cerradas. La eliminación de secuencias desde LeftPanel borra sus frames del proyecto y se puede deshacer; «Quitar» solamente la separa del sistema. La interfaz Electron debe validarse manualmente para marcador, arrastre, guardado y reapertura.
