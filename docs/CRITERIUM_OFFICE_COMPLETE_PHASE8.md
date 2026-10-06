# Fase 8 — Integración de oficina CRITERIUM (estado parcial)

## Arquitectura y recorrido

`LeftPanel` monta `CriteriumPanel` y usa las APIs ya expuestas por `ThreeCanvas`. El panel crea un `CRITERIUM_SYSTEM` vacío sin seleccionar un objeto físico, permite crear secuencias y agregarlas, y edita los módulos mediante slots lógicos asociados a frames físicos. `Properties` conserva la edición detallada de frames y partes. La creación y edición usan los constructores existentes. La selección, transformaciones e historial continúan en el estado global, sin un motor paralelo.

La separación `slotId`/`moduleId`/`frameId` permanece en `sequenceModuleSlots.js`: un slot conserva orden, dimensión, orientación y `transformOverride`; cada duplicación recibe IDs nuevos. Los puntos de conexión se calculan desde los terminales físicos de los frames. Solo LINEAR y 90° pueden validarse; T/X carecen de un anclaje físico lateral documentado.

Durante el arrastre 3D de una secuencia, el motor existente presenta origen, destino, línea y posición prevista. Conserva la tolerancia configurada del sistema o la predeterminada (captura 0,30 m; vista previa 0,45 m). Al soltar, se aplica un snap válido y se registra una operación espacial. El arrastre de un frame hacia su slot usa el mismo marcador sin cambiar la identidad del frame. No se modificaron cámara, renderer, escalas ni geometría comercial.

`layoutCritteriumOffice` usa conexiones persistidas, conserva la orientación, valida puntos y colisiones, y restaura los transforms anteriores si no encuentra una disposición válida. `runCritteriumSpatialOperation` agrega una sola acción de historial para organizar o conectar. La proximidad paramétrica distingue `VALID`, `NEAR_COLLISION` y `COLLISION_REAL`; los contactos de terminales conectados se tratan según los pares de conexión física existentes.

## Corrección aplicada en Fase 8

La edición de slots ya prevalidaba si un extremo conectado cambiaría de frame, pero la conciliación posterior aún podía descartar una conexión si el rebuild devolvía un terminal inesperado. `reconcileCritteriumConnectionsAfterSequenceEdit` ahora admite rechazo estricto: calcula el resultado sin mutar las conexiones y lanza `Desconecte primero el extremo afectado.` si perdería alguna. La ruta del editor de slots usa este modo y su rollback existente restaura la operación. Las llamadas anteriores conservan su comportamiento para compatibilidad.

El panel etiqueta la creación desde cero como «Crear oficina vacía». Los diagnósticos de conexión, orientación, dimensión, colisión, frame faltante, código sin precio, acabado sin validar y catálogo cambiado se muestran con texto comprensible desde una tabla central de CRITERIUM. Los códigos siguen disponibles en los datos de diagnóstico. BOM y cotización permanecen derivados de los descriptores comerciales, no de meshes.

## Verificación automatizada

`test/critteriumOfficePhase8.test.js` usa frames y secuencias físicos CRITERIUM para verificar identidad, movimiento de sistema, rotación de secuencia, BOM, cotización y Smart Snap, y prueba que una conciliación estricta rechaza una pérdida de conexión sin mutar el sistema. Las pruebas previas cubren creación de oficina y secuencias, edición/duplicación de slots, conexiones LINEAR/90°, organización, rollback, colisiones, historial espacial, persistencia y exportación comercial. Cada caso automatizado prueba su recorrido específico; no sustituye la interacción con mouse en una ventana.

Validación final: `npm test` ejecutó 375 casos, 346 pasaron y 29 fallaron, el mismo número de fallos previo a Fase 8 en KONCISA, LINK y LOCKERS. Las tres pruebas nuevas pasaron. `npm run build` pasó con advertencias de versión Node y tamaño de chunks. `git diff --check` pasó. ESLint pasó para panel, resolver, tabla de diagnósticos y prueba nueva; `ThreeCanvas.jsx` conserva un error preexistente de variable sin uso (`integrationNearEdgeOutwardZ`, línea 14546), ajeno al cambio CRITERIUM.

## Checklist de Electron

La ejecución automatizada de Electron en esta fase no llegó a `app.whenReady()` dentro de 20 segundos; Vite sí sirvió la aplicación. No se ejecutó una sesión interactiva visible con mouse. La prueba automatizada de Electron de Fase 7 verificó crear, cotizar, agregar un módulo, guardar y reabrir, pero no cubre el recorrido completo de Fase 8.

| Paso | Estado de Fase 8 |
|---|---|
| A. Crear oficina; B. crear dos secuencias; C. agregar módulos | Pendiente de interacción Electron |
| D. Seleccionar frame; E. mover frame; F. mover secuencia; G. mover sistema | Pendiente de interacción Electron |
| H. Conectar; I. Smart Snap visual; J. organizar; K. rotar | Pendiente de interacción Electron |
| L. Ctrl+Z; M. Ctrl+Y | Pendiente de interacción Electron |
| N. Guardar; O. cerrar; P. abrir | Pendiente de recorrido completo Electron |
| Q. Revisar BOM; R. revisar cotización; S. exportar JSON | Pendiente de recorrido completo Electron |

## Límites y criterio de cierre

La auditoría comercial 7.2 permanece vigente: no hay puerta CRITTERIUM 8 ni dos acabados comerciales individuales validados. EUC carece de precio para `22191200755`; la cotización muestra línea pendiente y total parcial. La vista 3D de Smart Snap, la selección por clic, el movimiento/rotación por mouse, Undo/Redo y guardar/reabrir la oficina completa requieren la checklist interactiva. La Fase 8 **no se declara cerrada** hasta completar esas pruebas o contar con evidencia equivalente ejecutada realmente.

## Fase 8.1 — validación interactiva (4 de octubre de 2026)

Se intentó abrir Electron mediante su binario directo con `ELECTRON_RUN_AS_NODE` desactivado, registro de eventos de ciclo de vida, `--disable-gpu --no-sandbox` y un perfil `userData` temporal nuevo. El proceso reconoció Electron 39.2.7, pero `app.whenReady()` continuó sin resolverse tras 15 segundos en tres intentos. No se recibió el evento `ready` ni se creó una ventana. El perfil nuevo descarta que el bloqueo se deba únicamente al perfil de usuario anterior. La causa exacta de la inicialización detenida no quedó identificada; la prueba no alcanza todavía la aplicación, Vite ni el flujo CRITERIUM.

**Actualización 8.2:** esa conclusión describía el archivo de diagnóstico `.mjs`, no el entrypoint real. La comparación controlada posterior identificó el `await app.whenReady()` de nivel superior en ese archivo como causa del bloqueo. Electron y la aplicación real sí arrancan; véase la sección siguiente.

| Recorrido solicitado | Resultado 8.1 | Evidencia / límite |
|---|---|---|
| A–C: crear oficina, secuencias y módulos | ⚠️ Pendiente | Electron no llegó a `ready`; no hubo interacción visible. |
| D–G: seleccionar y mover frame, secuencia y sistema | ⚠️ Pendiente | No hubo ventana para clic o arrastre real. |
| H–K: conectar, ver Smart Snap, organizar y rotar | ⚠️ Pendiente | Sin interacción 3D; las pruebas de motor no prueban el marcador en pantalla. |
| L–M: Undo/Redo | ⚠️ Pendiente | Sin interacción mediante teclado en Electron. |
| N–P: guardar, cerrar y reabrir | ⚠️ Pendiente | No se abrió una sesión de aplicación. |
| Q–S: BOM, cotización y exportación | ⚠️ Pendiente | No se verificaron en la interfaz de la oficina completa. |

`node --test` para integración de oficina, Fase 8, Smart Layout y Fase 6: **24/24 pasaron**. `npm test`: **346/375 pasaron, 29 fallaron** en otras líneas, igual al resultado anterior. `npm run build`: **pasó**, con aviso de versión Node (20.17.0 frente al mínimo declarado por Vite) y tamaño de chunks. `npm run lint`: **falló** con 159 problemas globales (150 errores, 9 avisos), repartidos entre servidor y diversas líneas; no constituye una validación limpia del repositorio. `git diff --check`: **pasó**. Esta fase no añadió correcciones de producto porque no se reprodujo un defecto funcional dentro de CRITERIUM. La Fase 8.1 permanece **pendiente de validación interactiva**.

## Fase 8.2 — diagnóstico Electron (4 de octubre de 2026)

El entrypoint de la aplicación es `electron/main.js` (`package.json`: `main` y script `electron .`). Utiliza `app.whenReady().then(createWindow)` y carga `http://localhost:5173`. La dependencia instalada es Electron 39.2.7; el runtime dentro de Electron reportó Node 22.21.1, el Node de `npm` es 20.17.0 y el sistema reportó Windows 10.0.26100.4652. No hay electron-builder ni electron-forge en `package.json`.

Reproducción mínima conservada en `electron/phase82-esm.mjs` y `electron/phase82-esm-then.mjs`. Ejecutar desde la raíz `electron\phase82-esm.cmd` deja `ELECTRON_RUN_AS_NODE` sin definir y produce `ESM_START` seguido de `ESM_TIMEOUT ready=false`, código 2; no hay ventana ni carga de URL. `electron\phase82-esm-then.cmd` ejecuta el mismo tipo de módulo con `.then(...)` y produce `ESM_THEN_READY`, código 0. La prueba CommonJS `electron\phase82-minimal.cmd A` también produce `ELECTRON_READY`, código 0. Por tanto, el bloqueo previo estaba en el `await app.whenReady()` de nivel superior del **diagnóstico**, que impide completar el arranque de Electron en esta configuración; no se reprodujo en `electron/main.js`. No se cambió el entrypoint ni se dejaron flags de diagnóstico en la aplicación.

El proceso heredaba `ELECTRON_RUN_AS_NODE=1`; cada archivo `.cmd` de reproducción lo elimina solo para su hijo. El binario usado fue `node_modules\electron\dist\electron.exe`, sin flags en los resultados principales. `userData` predeterminado: `C:\Users\jeigarca\AppData\Roaming\Electron`; caché: `C:\Users\jeigarca\AppData\Roaming`. `--disable-gpu`, `--no-sandbox` y ambos juntos también alcanzaron `ready` en el caso CommonJS; ninguno fue necesario. La métrica temprana de GPU informó WebGL desactivado, pero dentro del renderer ya montado `getContext('webgl')` y `getContext('webgl2')` devolvieron contextos válidos; por tanto esa métrica temprana no demuestra un bloqueo 3D. Al consultar `getAppMetrics()` justo después de `ready` apareció el proceso Browser; no se observó `child-process-gone` ni `render-process-gone`. La salida estándar de las pruebas está en `electron/phase82-minimal.log`; stderr mostró un aviso de API `console-message` en la primera versión del probe. El renderer informó un aviso CSP de desarrollo. Los scripts de reproducción registran ejecutable, argumentos, entorno y eventos.

| Capa | Resultado |
|---|---|
| Electron mínimo | ✅ Pasó: CommonJS y ESM con `.then(...)`; falla únicamente el probe ESM con `await` superior. |
| `app.whenReady()` | ✅ Resuelto en CommonJS y entrypoint real; el probe ESM con `await` superior expiró. |
| `BrowserWindow` | ✅ Se creó en la prueba B. |
| HTML | ✅ Se cargó una URL `data:text/html` en la prueba C. |
| Vite | ✅ `http://localhost:5173` respondió y Electron cargó la página. |
| React | ✅ Montó `#root` y mostró el acceso de desarrollo. |
| ThreeCanvas | ✅ Tras iniciar sesión de desarrollo se encontraron dos elementos `canvas`; no hubo error de renderer. |
| CRITERIUM | ✅ Se abrió el panel y se recorrieron por clic instrumentado creación, secuencia, BOM y cotización. No equivale a validación manual 3D. |

### Validación interactiva

Los recorridos marcados «UI instrumentada» fueron clics DOM ejecutados en una ventana Electron real, sin observación humana del mouse ni arrastre físico. Son evidencia limitada de que el flujo responde. La prueba con mouse/teclado solicitada sigue pendiente donde se indica.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Crear oficina | ✅ UI instrumentada | «Crear oficina vacía» mostró sistema seleccionado con 0 secuencias. |
| Crear secuencia | ✅ UI instrumentada | «Crear y agregar al sistema» mostró secuencia de 2 frames y 3 junctions. |
| Slots | ⚠️ Pendiente | No se abrió ni editó un slot durante esta ejecución. |
| Selección | ⚠️ Parcial | La creación seleccionó sistema/secuencia; falta seleccionar explícitamente sistema, secuencia y frame por clic. |
| Movimiento | ⚠️ Pendiente | Sin arrastre de frame, secuencia o sistema. |
| Smart Snap | ⚠️ Pendiente | Sin arrastre ni inspección visual de marcador, zoom o rotaciones. |
| Conexión/desconexión | ⚠️ Pendiente | No se ejecutó con mouse ni desde panel. |
| Organización/rotación | ⚠️ Pendiente | No se ejecutó en Electron. |
| Colisión | ⚠️ Pendiente | No se provocó contacto ni solapamiento. |
| Undo | ⚠️ Pendiente | Sin Ctrl+Z en Electron. |
| Redo | ⚠️ Pendiente | Sin Ctrl+Y en Electron. |
| Guardar/cerrar/abrir | ⚠️ Pendiente | No se guardó ni reabrió la oficina de tres secuencias. |
| BOM | ✅ UI instrumentada | «Ver BOM del sistema» mostró 1 secuencia, 2 módulos y cinco filas de componentes. |
| Cotización | ✅ UI instrumentada | Mostró tres códigos agrupados, 5 componentes y total 1.512.000 COP en el caso de prueba; no se comparó con persistencia. |

La causa del bloqueo de arranque quedó identificada y la aplicación completa abre. La **validación manual 3D de Fase 8.2 sigue pendiente**, en particular Smart Snap a distintas escalas, selección y movimiento por mouse, conexiones, historial y persistencia completa. No se encontró un defecto reproducible de CRITERIUM que justifique modificar su código.

Validación final 8.2: `npm test` ejecutó 375 pruebas (**346 pasaron, 29 fallaron** en otras líneas); `npm run build` **pasó** con los mismos avisos de Node 20.17.0 y tamaño de chunks; `npm run lint` **falló** con 150 errores y 9 avisos globales; `git diff --check` **pasó**. El lint dirigido y la batería dirigida CRITERIUM de la Fase 8.1 conservan sus resultados previos; no se modificó código de producto en 8.2.

## Fase 8.3 — interacción nativa automatizada en Electron

Se ejecutó `electron/phase83-interactive.cmd` dentro de Electron 39.2.7 con eventos nativos `sendInputEvent` de mouse, arrastre y teclado. Los objetos del escenario se crearon **mediante botones de la interfaz**, sin inyectarlos en Three.js. La lectura de `getCritteriumStructure()` y `getPartsSnapshot2D()` fue de solo lectura y sirvió para comprobar IDs y posiciones. Esta ejecución automatizada con mouse y teclado **no equivale a una sesión manual humana**. La ventana estuvo oculta durante la ejecución, por lo que una captura de pantalla no valida por sí sola la legibilidad visual del marcador Smart Snap.

Se reprodujeron y corrigieron dos defectos en `ThreeCanvas.jsx`: al crear la primera secuencia, la cámara 3D no encuadraba el objeto; y en modo «Pieza individual» el arrastre del frame tomaba el poste físico pulsado en lugar del frame completo. La corrección usa `frameObject` al crear y resuelve la raíz del frame CRITERIUM antes de la pieza. La regresión Electron exige que el primer frame aparezca en la captura 3D, que el arrastre altere exactamente un frame físico y que Ctrl+Z/Ctrl+Y restauren y reapliquen sus posiciones sin cambiar IDs. En el caso ejecutado, un frame pasó de `(0,45; 0)` a `(1,77205; −1,32205)` m; los otros tres permanecieron en su sitio. El `transformOverride` del slot reflejó el desplazamiento. La aplicación conservó la identidad del frame.

La prueba de slots sobre una misma secuencia obtuvo 2→3→4→5→5→4 módulos al agregar, insertar, duplicar, reordenar y reducir. Tras cada paso, `slotId`, `moduleId` y `frameId` fueron únicos; las posiciones correspondieron al orden y el botón «↑» intercambió los dos primeros slots. La prueba verifica estos valores con aserciones y terminó con código 0. Las capturas generadas por el arnés incluyen `phase83-first.png`, `phase83-base.png` y las etapas de arrastre.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Crear oficina | PASS | Clic nativo en «Crear oficina vacía»; sistema creado. |
| Crear secuencia | PASS | Dos clics nativos en «Crear y agregar al sistema»; dos secuencias de dos frames. |
| Slots | PASS | Agregar, insertar, duplicar, reordenar y reducir; trayectoria 2→3→4→5→5→4 e IDs únicos. |
| Selección sistema | PENDING | El botón «Seleccionar sistema» mostró sistema e ID correctos; falta selección directa de un espacio del sistema mediante mouse. |
| Selección secuencia | PASS | Clic nativo en el modelo mostró `FrameSequence` e ID, sin seleccionar el sistema completo. |
| Selección frame | PENDING | Clic en poste identificó `FRAME_LEFT_POST` y mostró configuración del frame; botón de slot seleccionó el frame. Falta validar correspondencia visual del slot mediante clic directo. |
| Movimiento frame | PASS | Arrastre nativo y aserción de un único frame movido, IDs constantes; `transformOverride` actualizado. |
| Movimiento secuencia | PENDING | No se ejecutó arrastre de secuencia. |
| Movimiento sistema | PENDING | No se ejecutó arrastre del sistema completo. |
| Smart Snap | PENDING | No se verificó candidato, marcador y captura automática con distancias controladas. |
| Smart Snap zoom | PENDING | No se ejecutaron distancias controladas con rueda y tres niveles de zoom. |
| Smart Snap rotación | PENDING | No se ejecutó el escenario con secuencia y sistema rotados. |
| Conexión | PENDING | No se conectaron secuencias en Electron. |
| Desconexión | PENDING | No se desconectó una conexión en Electron. |
| Slot conectado | PENDING | No se ensayó el rechazo «Desconecte primero el extremo afectado.» en Electron. |
| Organización | PENDING | No se creó ni organizó A→B→C en Electron. |
| Colisiones | PENDING | No se provocaron y midieron VALID, NEAR_COLLISION y COLLISION_REAL en Electron. |
| Rotación | PENDING | No se rotaron frame, secuencia y sistema en Electron. |
| Undo | PASS | Ctrl+Z nativo restauró las cuatro posiciones tras el arrastre de frame; otras operaciones siguen pendientes. |
| Redo | PASS | Ctrl+Y nativo reaplicó la posición exacta del frame e IDs; otras operaciones siguen pendientes. |
| Persistencia | PENDING | No se guardó, cerró y reabrió la oficina compleja de tres secuencias. |
| BOM | PENDING | Fase 8.2 mostró BOM por UI instrumentada; falta comparación antes/después de guardar, mover y editar. |
| Cotización | PENDING | Fase 8.2 mostró cotización por UI instrumentada; falta comparación antes/después de reabrir. |
| Exportación | PENDING | No se exportó ni inspeccionó el JSON comercial en Electron. |

La Fase 8.3 **permanece abierta**. En particular, Smart Snap, conexiones, movimiento del sistema, persistencia y continuidad comercial requieren pruebas interactivas adicionales. Los PASS de esta tabla describen exclusivamente las operaciones concretas ejecutadas por el arnés, no una validación manual de todos los casos de cada categoría.

### Continuación de Fase 8.3 — conexiones y exportación

Se añadió `electron/phase83-remaining.cjs` y su lanzador para probar los pendientes mediante una oficina de **tres secuencias creada por botones de la UI**. La selección de los desplegables «Secuencia origen/destino» por teclado nativo no cambió su valor en la ventana Electron oculta; el arnés aplicó un evento `change` DOM instrumentado para elegirlos y registró explícitamente ese fallback. Alinear, conectar, organizar, desconectar, cotizar y exportar recibieron clics nativos. Por eso esta evidencia prueba el flujo de producto dentro de Electron, pero no certifica manejo manual del desplegable ni el gesto de Smart Snap.

Tras «Alinear extremos», «Conectar extremos cercanos» creó una conexión `LINEAR` con IDs de secuencias y terminales. Repetir en orden B→A mantuvo el conteo en uno y mostró `CRITERIUM_SYSTEM_DUPLICATE_CONNECTION`. «Organizar oficina» conservó la conexión y las filas BOM. «Desconectar» dejó cero conexiones y seis frames; Ctrl+Z restauró la conexión y Ctrl+Y volvió a quitarla. Las 15 filas BOM y sus cantidades fueron idénticas antes de conectar y después de conectar, organizar y desconectar. El arnés exige estas condiciones mediante aserciones; la última ejecución terminó con código 0.

El botón «Cotización» generó una cotización y «Exportar JSON comercial» descargó `electron/phase83-export.json`. El archivo contiene `systemId`, moneda, tres líneas con código, referencia, cantidad, material, acabado, precio unitario y subtotal, además de total y diagnósticos. `reference` y `finishCommercial` fueron `null` en este caso, tal como permite el catálogo disponible. No contiene `Object3D`. Esta exportación **se hizo antes de guardar/reabrir**; su continuidad posterior sigue pendiente.

| Prueba pendiente | Resultado | Evidencia y límite |
|---|---|---|
| Smart Snap | PENDING | No se midió candidato, marcador, ajuste automático ni conexión mediante arrastre. |
| Snap 50 mm | PENDING | Sin escenario de arrastre a 50 mm. |
| Snap 100 mm | PENDING | Sin escenario de arrastre a 100 mm. |
| Snap 200 mm | PENDING | Sin escenario de arrastre a 200 mm. |
| Snap 250 mm | PENDING | Sin escenario de arrastre a 250 mm. |
| Snap 299 mm | PENDING | Sin escenario de arrastre a 299 mm. |
| Snap 300 mm | PENDING | Sin escenario de arrastre a 300 mm. |
| Snap 301 mm | PENDING | Sin escenario de arrastre a 301 mm. |
| Snap con zoom | PENDING | No se repitió el mismo caso a tres zoom con rueda. |
| Snap con rotación | PENDING | No se probó captura tras rotar secuencia y sistema. |
| Movimiento secuencia | PASS | Arrastre nativo movió exactamente los dos frames de una secuencia; `systemId` y 15 filas BOM permanecieron iguales. Undo/Redo de este movimiento aún no se verificó. |
| Movimiento sistema | PENDING | Tras «Seleccionar sistema», el arrastre ensayado no produjo movimiento medible (0 de 6 frames); falta distinguir punto de clic inválido de defecto del producto y probar Undo/Redo. |
| Conexión | PASS | Botón de UI en Electron creó A→B `LINEAR`; B→A mostró duplicado y dejó una conexión. Selección de secuencias instrumentada. |
| Desconexión | PASS | Clic nativo dejó cero conexiones y seis frames; Ctrl+Z/Ctrl+Y restauraron y quitaron la relación. |
| Organización | PENDING | El botón organizó sin perder la conexión ni alterar BOM; falta caso A→B→C deliberadamente desplazado, colisiones y Undo/Redo. |
| Colisión | PENDING | No se provocaron los tres estados mediante interacción. |
| Persistencia | PENDING | «Guardar» descargó JSON, «Nuevo» vació la escena y la carga por input de archivo restauró `systemId`, tres `sequenceId`, seis pares `slotId`/`moduleId`/`frameId`, conexión con terminales y posiciones físicas exactas. Faltan rotaciones, slots editados y cierre/reinicio de ventana; el input de archivo fue instrumentado. |
| BOM tras reapertura | PASS | Las 15 filas BOM y cantidades fueron idénticas antes y después de cargar el proyecto. Falta comprobar incremento/reducción tras editar módulos. |
| Cotización tras reapertura | PASS | Dos exportaciones generadas por botón antes y después coincidieron en códigos, cantidades, precios, moneda COP, subtotales, total 4.536.000 y diagnósticos. |
| Exportación | PASS | JSON comercial descargado antes y después de cargar el proyecto; contiene campos comerciales y no contiene `Object3D` ni meshes. |

T/X siguen `NOT_SUPPORTED`: no existe anclaje físico lateral o intermedio documentado para esas topologías. **La Fase 8.3 no se cierra** con esta continuación.

El recorrido de persistencia descargó `electron/phase83-project.json` mediante «Archivo → Guardar», ejecutó «Nuevo», confirmó cero sistemas y cargó el mismo archivo mediante el input de proyecto. La elección de archivo fue instrumentada con `File`/`DataTransfer` porque la ventana de Electron usada por el arnés permanece oculta. Se compararon todos los IDs y posiciones registrados por `getCritteriumStructure()` y `getPartsSnapshot2D()`; no se hizo un cierre completo de la ventana. Los archivos `electron/phase83-quote-before.json` y `electron/phase83-quote-after.json` son las dos cotizaciones efectivamente descargadas por la UI.
