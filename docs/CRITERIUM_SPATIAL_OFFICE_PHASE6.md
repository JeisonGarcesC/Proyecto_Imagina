# Fase 6 — Diseñador espacial CRITERIUM (parcial)

## Arquitectura actual y extensión

`CRITERIUM_SYSTEM` conserva las secuencias físicas, slots, frames y conexiones de las fases anteriores. El trazado lógico se deriva en `CritteriumSpatialTopology.js` de los puntos terminales y de `system.userData.connections`. No crea meshes, productos, códigos ni filas BOM. Los nodos tienen identidad estable basada en `sequenceId|connectionPointId`; las conexiones conservan su `connectionId`.

La conexión lineal y la esquina de 90° usan `CritteriumSnapEngine`, `CritteriumConnectionRules` y el mismo método de conexión existente. El botón de esquina exige que el candidato sea `DEG_90`. Se conservan las reglas de altura, profundidad, orientación y distancia del motor actual. No hay un segundo motor de snap ni de conexiones.

La geometría actual expone únicamente `TERMINAL_START` y `TERMINAL_END` por secuencia. No hay un anclaje lateral o intermedio validado para T o cruce. Solicitudes con `T_JUNCTION` o `CROSS` se rechazan con `UNSUPPORTED_SPATIAL_TOPOLOGY`; no se generan partes ficticias. Una terminal ocupada tampoco admite una segunda unión.

## Trazado, medición y recinto

El análisis devuelve nodos, relaciones, longitud aproximada por secuencia, longitud total y componentes cerrados de tres o más secuencias con conexiones espaciales válidas. El área aproximada se obtiene con los centros de las secuencias del ciclo; no representa una superficie comercial ni detecta puertas. Las posiciones y medidas derivadas se redondean a seis decimales para que una serialización repetida sea estable tras restaurar el proyecto. Una conexión desplazada o sin punto conserva su diagnóstico y no cuenta como arista válida para cerrar un recinto.

El LeftPanel muestra estas medidas y permite seleccionar una conexión lógica, inspeccionar su tipo y extremos, y eliminarla mediante la API existente. Las conexiones no se convierten en objetos de Three.js ni en productos. Las acciones de conectar, desconectar, mover, rotar y organizar siguen usando el historial espacial global ya existente. El BOM se resuelve solo de frames y junctions físicos.

`serializeCritteriumSystem` guarda `spatialNodes`, `spatialConnections`, `closedLoops` y `spatialMeasurements` como proyección de lectura. Al cargar, se reconstruyen secuencias y conexiones físicas y se vuelve a derivar el trazado; los campos derivados no son una segunda fuente de verdad. Esto evita nodos duplicados y conserva compatibilidad con proyectos anteriores.

## Pruebas y límites

`test/critteriumSpatialOfficePhase6.test.js` verifica nodos y longitudes lineales, un ciclo cerrado de cuatro secuencias físicas a 90°, rechazo de T/cruce y BOM idéntico antes y después. Las pruebas existentes de sistema, layout e integración comprueban restauración, Undo/Redo y compatibilidad con la serialización extendida.

Validación de esta continuación: las 23 pruebas pertinentes de sistema, layout, integración y trazado pasaron. `npm test` ejecutó 357 pruebas: 328 correctas y 29 fallidas, las mismas 29 fallas que había antes de Fase 6. `npm run build` y `git diff --check` pasaron. El lint de los archivos de Fase 6 no señaló errores nuevos; al incluir ThreeCanvas aparece un error anterior por una variable no usada en código ajeno a CRITERIUM. La interfaz Electron no se ejecutó en esta continuación, por lo que sus gestos visuales siguen pendientes.

Quedan pendientes una herramienta para organizar oficinas arbitrarias sin romper conexiones, interacción visual 3D de la selección de conexiones, clasificación específica de colisión cercana, mediciones entre secuencias y validación interactiva en Electron de esquina, recinto y arrastre. T y cruce requieren una definición física y comercial de anclajes laterales o intermedios antes de poder implementarse. Por estas razones la Fase 6 permanece **PARCIAL**.

## Continuación 6.1 — Auto Layout y colisiones

La auditoría de los puntos físicos confirmó que `CritteriumConnectionResolver` solo publica los terminales START y END de cada secuencia. No hay anclaje lateral ni intermedio, y ninguna pieza actual documenta la unión comercial correspondiente. Por ello T y cruce continúan rechazados con `UNSUPPORTED_SPATIAL_TOPOLOGY`; el diagnóstico nombra el anclaje faltante y la ausencia de pieza documentada. El LeftPanel muestra ambas opciones como no disponibles.

«Organizar oficina» reutiliza las conexiones persistidas LINEAR y DEG_90. Recorre cada componente conectado en el orden de `sequenceIds`, conserva la orientación de sus secuencias y traslada cada terminal al punto físico conectado. Comprueba clasificación de conexión, tolerancia de puntos y solapamientos; si falla, restaura todas las posiciones y el layout anterior y devuelve `NO_VALID_LAYOUT`. Sin conexiones conserva el layout lineal existente. El controlador registra la organización como una sola acción `CRITERIUM_SYSTEM_AUTO_LAYOUT`; su Undo/Redo usa el historial espacial global. El layout no usa meshes, zoom ni valores aleatorios.

La proximidad entre huellas paramétricas de frames se clasifica como `VALID`, `NEAR_COLLISION` o `COLLISION_REAL`. Las constantes centralizadas son 1 mm para reconocer solapamiento y 5 cm para cercanía. El único par omitido del diagnóstico es el de frames terminales que participan en una conexión LINEAR o DEG_90 físicamente válida; otras invasiones, incluso de una tercera secuencia, siguen detectándose. El trazado lógico expone estos diagnósticos con IDs de secuencias y frames.

Las pruebas 6.1 verifican los tres estados de proximidad, organización lineal con esquina, ausencia de solapamiento no esperado, determinismo, una acción reversible, BOM estable, aceptación posterior por Smart Snap y reversión completa de un layout imposible. Las 26 pruebas CRITERIUM pertinentes pasaron. `npm test` ejecutó 360 pruebas: 331 correctas y los mismos 29 fallos anteriores de otras líneas. `npm run build` y `git diff --check` pasaron. ESLint sobre los archivos cambiados solo señaló la variable no usada preexistente `integrationNearEdgeOutwardZ` de ThreeCanvas.

En Electron se creó un sistema vacío con dos secuencias, se pulsó «Organizar oficina» mediante un evento de mouse y el panel informó éxito. Se enviaron Ctrl+Z y Ctrl+Y, se guardó un proyecto de siete entidades y se reabrió en una ventana recargada. La interfaz restauró un sistema y dos secuencias; el indicador BOM fue $3.024.000 antes de organizar y después de reabrir. Esta comprobación no inspeccionó visualmente un arrastre 3D ni sus marcadores de snap; ese gesto permanece pendiente. La prueba automatizada de historial sí comparó todas las transformaciones antes, después, Undo y Redo.
