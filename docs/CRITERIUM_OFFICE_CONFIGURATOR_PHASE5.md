# Fase 5 — PARCIAL: configurador de oficina CRITERIUM

## Auditoría de cierre 5.1

Las operaciones del LeftPanel reutilizan las APIs de ThreeCanvas y los constructores CRITERIUM existentes. La estructura persistida sigue siendo sistema → secuencia → slot → frame; las partes físicas y el BOM se derivan de los frames y junctions. Los slots no crean meshes seleccionables propios: al pulsar un slot en el LeftPanel se selecciona su frame físico. La selección hecha en 3D actualiza el sistema visible y resalta el frame correspondiente.

Se corrigió la limpieza de conexiones tras reconstruir una secuencia: si se elimina el frame que aporta un terminal conectado, esa conexión se retira. Los extremos que sobreviven actualizan tanto `sourcePointId`/`targetPointId` como `pointAId`/`pointBId`. Organizar sistema revierte la operación si una conexión espacial queda inválida. La prueba `critteriumOfficeIntegration.test.js` cubre la limpieza de terminales y una oficina real con tres secuencias, siete frames, conexión, organización, serialización, restauración, identidades y equivalencia del BOM. La tercera secuencia de esa prueba se construye con la misma configuración que B; no ejecuta el botón Duplicar.

La plantilla de un módulo permanece deshabilitada porque el validador, el builder y las operaciones de secuencia actuales exigen al menos dos frames conectados. No se encontró una regla comercial que por sí sola prohíba un módulo; el límite es del contrato de secuencia implementado. Un frame individual sí puede crearse desde la pestaña Frame.

Hay XML de listas de precios en `public/data/xml` y algunas referencias del catálogo CRITERIUM aparecen allí. Todavía no está demostrada la cobertura completa ni la selección de moneda, país, vigencia y acabados para todas las filas que produce el BOM. La vista de oficina informa que la información comercial no está disponible para esa configuración y no calcula importes.

Permanecen sin verificación interactiva los botones del LeftPanel, selección de partes, Undo/Redo, duplicación completa y guardar/cerrar/reabrir en Electron. También falta una prueba automatizada que ejecute el controlador completo de ThreeCanvas, que depende de la interfaz y de su historial global. Por ello la fase continúa parcial.

Validación final de 5.1: `npm test` ejecutó 352 pruebas, con 323 aprobadas y 29 fallidas; estas 29 ya estaban presentes antes de 5.1. `npm run build` y `git diff --check` pasaron. El lint acotado a CRITERIUM y las pruebas nuevas pasó; el lint que incluye LeftPanel y ThreeCanvas señaló seis errores preexistentes de esos archivos. La interfaz Electron no fue ejecutada ni marcada como aprobada.

## Auditoría funcional 5.2

El LeftPanel contiene controles que llaman a las APIs actuales de ThreeCanvas para sistema vacío, plantilla, secuencia nueva o existente, retirar, duplicar, insertar/reordenar/configurar/eliminar slots, conectar/desconectar y organizar. «Crecer» usa `ADD` y «Reducir» usa `REMOVE`; son las mismas operaciones de slot y no un segundo motor. El historial global tiene tipos y rutas de replay para sistema, secuencia y slot. Los tests de dominio verifican parte de esas rutas, pero no ejecutan el controlador React/ThreeCanvas completo ni el gesto de mouse o los atajos de teclado en Electron.

Se encontró que la reconciliación de conexiones podía reasignar una relación a otro frame terminal tras agregar o reordenar módulos. Ahora la prevalidación del controlador rechaza esa edición cuando afecta un extremo conectado e indica desconectarlo primero. El reconciliador también descarta una relación si su frame terminal cambia por cualquier otra ruta. La duplicación de secuencia ahora rechaza secuencias incompletas cuando el número de slots no coincide con los frames físicos. No se alteraron los catálogos, la geometría comercial ni el BOM.

Los XML `PriceList_CO_2.xml`, `PriceList_USD_2.xml` y `Pricelist_EUC_2.xml` contienen códigos usados por el catálogo CRITERIUM, por ejemplo `22191900163` y `22191302086`. Esto acredita disponibilidad de precios para algunas referencias, pero no una cotización de oficina completa: no se verificó cobertura de todas las filas, acabados, país, moneda y vigencia. La vista distingue códigos y cantidades del BOM de precios no disponibles en esa vista.

La prueba automatizada de 5.2 cubre el bloqueo de editar terminales conectados y que una conexión no salte a otro frame al crecer o reordenar. La selección desde 3D, el gesto Smart Snap y la comparación entre el flujo anterior y LeftPanel siguen pendientes. La fase permanece **PARCIAL**.

En una ejecución local de Electron con interacción real sobre el DOM se comprobó: crear sistema vacío y secuencia, crecer/reducir, insertar y duplicar módulo, seleccionar un frame y abrir Properties, duplicar secuencia y sistema, Ctrl+Z/Ctrl+Y para crecimiento y duplicación de sistema, organizar linealmente, conectar y desconectar, y rechazar la conexión inversa duplicada. El BOM global cambió de forma coherente con las operaciones. La primera ejecución detectó que Ctrl+Z/Ctrl+Y no actualizaba el panel ni el BOM al duplicar el sistema; se agregó una revisión de historial para refrescar el panel y se emite el BOM tras el replay de acciones CRITERIUM. La repetición confirmó un sistema y $5.619.600 tras deshacer, dos sistemas y $11.239.200 tras rehacer.

Se guardó un proyecto de 22 entidades mediante Archivo → Guardar, se recargó la ventana de Electron y se abrió mediante Archivo → Abrir. Se conservaron los IDs de los dos sistemas y la estructura de cuatro secuencias de cuatro módulos. El primer intento dejó el indicador global del BOM en $0, aunque el resumen del sistema conservaba códigos y cantidades. La causa fue la carga asíncrona del catálogo después de restaurar el proyecto: al actualizarse el catálogo no se volvía a emitir el BOM. Se añadió el recálculo al recibir `catalogByCode` en ThreeCanvas. La repetición restauró el mismo total de $11.239.200 antes y después de abrir. Una edición posterior actualizó el total a $11.888.100.

La ejecución automatizada sobre Electron no sustituye una revisión visual humana: quedan pendientes el gesto físico de arrastre y Smart Snap, la selección de partes por clic sobre la escena, la inspección visual de posiciones y colisiones, la persistencia de acabados y conexiones en un proyecto que los contenga, y la comparación BOM del flujo anterior con LeftPanel. Tampoco se verificaron todas las combinaciones de plantilla y controles. No se atribuye a estas acciones un resultado de prueba ejecutada.

Validación final tras las correcciones: `npm test` ejecutó 354 pruebas, con 325 correctas y 29 fallidas (el mismo conjunto de fallos ajenos a CRITERIUM); `npm run build` pasó con avisos de versión de Node y tamaño de chunks; `git diff --check` pasó. ESLint sobre App, CRITERIUM, LeftPanel, ThreeCanvas y pruebas señaló seis errores anteriores en LeftPanel (cinco) y ThreeCanvas (uno), sin errores nuevos en los archivos modificados de CRITERIUM.

## Alcance implementado

El LeftPanel abre CRITERIUM en la vista Sistema. Permite crear un sistema vacío o uno con secuencias configuradas; seleccionar sistemas existentes; agregar una secuencia nueva o una existente; editar slots mediante las operaciones de la fase 4.1; conectar, alinear y organizar secuencias; duplicar una secuencia o un sistema; y consultar el BOM del sistema. La creación física reutiliza los constructores existentes de frames, secuencias y sistemas. Los cambios de geometría comercial siguen en Properties.

Las plantillas de dos y tres módulos generan borradores que pasan por la validación comercial actual. La plantilla de un módulo queda deshabilitada: el contrato vigente de `CRITTERIUM_8_SEQUENCE` requiere al menos dos frames físicos. El sistema vacío sí es válido. La composición personalizada usa el mismo editor de secuencias.

Agregar una secuencia nueva al sistema genera una sola acción `CRITERIUM_SYSTEM_CREATE_SEQUENCE`; duplicar un sistema genera una sola acción `CREATE_OBJECTS`. La duplicación crea IDs nuevos de sistema, secuencias, frames, slots y conexiones, copia la configuración de los frames y traslada la oficina 3 m en X. La estructura de selección sigue usando los IDs físicos existentes.

El resumen BOM usa `resolveCritterium8BOM` sobre los frames y secuencias pertenecientes al sistema. No existe un catálogo CRITERIUM de códigos de material/acabado ni un motor CRITERIUM de precios en este repositorio. Por ello, el panel no ofrece códigos libres ni calcula una cotización monetaria; los acabados existentes continúan siendo editables mediante Properties.

## Pruebas manuales en Electron pendientes

- Crear un sistema vacío y otro con las plantillas de dos y tres módulos.
- Seleccionar sistema, secuencia, frame y parte; editar un frame en Properties.
- Agregar una secuencia nueva y una existente; insertar, configurar, duplicar, reordenar y quitar un slot.
- Conectar dos secuencias, moverlas, alinear y organizar; verificar que no se produzcan colisiones no deseadas.
- Duplicar secuencia y sistema; comparar IDs, conexiones, posición y BOM con los originales.
- Para cada operación anterior, comprobar un paso de Undo y uno de Redo.
- Guardar, cerrar Electron y reabrir; comprobar IDs, transformaciones, slots, conexiones, acabados y BOM.
- Comparar el BOM de una configuración equivalente creada por el flujo anterior y por el LeftPanel.

Estas pruebas requieren interacción real con la interfaz; el build y las pruebas unitarias no las sustituyen.
