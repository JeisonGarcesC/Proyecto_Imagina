# Fase 10.1 — Crecimiento comercial CRITERIUM 8

## 1. Estado inicial

**PARTIAL.** La Fase 10 identificó cuatro códigos de módulo de crecimiento y una función de composición, pero faltaba una opción seleccionable de extremo a extremo. La definición del marco retenía la altura base mientras el constructor extendía las baldosas; el layout, los slots de secuencia y los terminales podían declarar la altura base en lugar de la física final. El árbol de trabajo inicial solo tenía una eliminación ajena de un PPTX de KONCISA; no se tocó.

## 2. Fuentes

**PASS.** `Criterium.pdf`, mapa de producto CRITERIUM 8, p. 6; `Ficha tecnica criterium.pdf`, p. 1; `ptsinbom_4.xml` y listas `PriceList_CO_2.xml`, `Pricelist_EUC_2.xml`, `PriceList_USD_2.xml`; catálogo y constructor existentes de CRITERIUM 8. El mapa explica que el módulo aumenta 38 cm un marco panel ya instalado hasta 204 cm, viene en 60–120 cm, y exige retirar y reinstalar el bisel superior. No se usaron reglas de CRITERIUM 6 ni de otra línea.

## 3. Código comercial

**PASS.** Los cuatro registros PT están activos en la línea exacta `CRITTERIUM 8`; cada código tiene precio positivo en CO (COP), EUC (USD) y USD (USD). La cotización lee esos importes de los XML vigentes.

| Ancho | Código existente | Altura del módulo | Cantidad por incremento |
|---:|---|---:|---:|
| 60 cm | `22191900163` | 38 cm | 1 |
| 75 cm | `22191900164` | 38 cm | 1 |
| 90 cm | `22191900165` | 38 cm | 1 |
| 120 cm | `22191900167` | 38 cm | 1 |

No se agregó ningún código ni precio. El material comercial se obtiene del PT cuando el catálogo de artículos lo provee; no se asigna un acabado supuesto.

## 4. Contrato de alturas

**PASS.** La altura del **marco base** sigue siendo la de su código comercial. Cada módulo adicional mide 38 cm y se instala sobre el marco anterior. La **altura física final** es base + 38 cm × cantidad, con máximo de 204 cm. Las transiciones admitidas por los datos y reglas actuales son 90→128→166→204, 128→166→204 y 166→204. El marco base no se reemplaza comercialmente por un marco final: el BOM contiene el código del marco inicial y una línea de crecimiento por cada módulo.

`config.heightCm` y `definition.heightCm` representan el marco base; `config.projectHeightCm`, `composition.heightCm`, layout, bounds 2D, slot de secuencia y punto terminal representan la altura física final. Esta separación evita contar dos marcos.

## 5. Configuración

**PASS.** El LeftPanel ofrece “Módulos de crecimiento (38 cm cada uno)” tanto para frame aislado como en los borradores de secuencia/sistema. Properties ofrece la misma opción en el frame seleccionado. Los valores disponibles salen de la regla de transición y del código existente del ancho. No se creó un preset de biblioteca. El panel valida antes de crear; la edición usa el parche de configuración existente.

## 6. Compatibilidad

**PASS para configuraciones probadas; PARTIAL para escenarios espaciales no documentados.** Se admite marco de media altura, composición modular, base 90/128/166, ancho 60/75/90/120, y máximo final 204. Se rechazan base 110, anchos sin código de crecimiento, composición de baldosa plena, marco a techo y altura mayor a 204. Una secuencia nueva con crecimiento se acepta solo si sus uniones resuelven un kit a la altura física final; una transición de altura sin kit validado se rechaza con diagnóstico. Las conexiones entre secuencias siguen pasando por la regla física de dimensiones existente.

## 7. Geometría

**PASS automatizado.** El módulo se ubica de `baseHeightCm` a `baseHeightCm + 38`, sobre el frame. El bisel superior queda en la altura final; el marco inferior permanece en su posición. Bounds, anchors y tile slots reflejan la altura final. La geometría del módulo ya existente se reutiliza; no se cambian cámara, escalas ni pivotes de otras líneas.

## 8. BOM

**PASS automatizado.** Un frame 90 × 60 sin crecimiento emite el marco `22191900002`. Con un módulo conserva ese marco y añade una unidad `22191900163`; no emite el marco 128 × 60. El BOM se construye con definiciones de partes, nunca recorriendo meshes. Las baldosas del tramo añadido conservan su slot; si se seleccionan, siguen el resolvedor existente.

## 9. Cotización

**PASS automatizado.** La cotización consume el BOM y usa el precio y la moneda de la lista seleccionada. En la prueba de CO, la diferencia entre base y crecimiento es exactamente el precio unitario del módulo, cantidad 1. `CODE_WITHOUT_PRICE` se conserva si una lista futura no trae un código; no se fijó importe en el configurador.

## 10. Persistencia

**PASS automatizado y en Electron para exportar, limpiar e importar el proyecto.** Se guardan IDs, configuración, cantidad de módulos, slots y transformaciones como datos serializables; al reconstruir se obtiene la misma altura física y el mismo BOM. La prueba serializa y restaura una secuencia de dos frames con crecimiento y compara moduleId, frameId, slots y códigos. En Electron se exportó, limpió e importó un frame crecido y luego dos sistemas crecidos: persistieron las cuatro cantidades de crecimiento, IDs y puntos terminales. **PENDING** cerrar completamente el proceso Electron y abrirlo de nuevo.

## 11. Historial

**PASS para frame aislado; PARTIAL para frame conectado.** Frame aislado usa `CRITTERIUM_8_CONFIG_CHANGE`; frame conectado se enruta por `CRITTERIUM_MODULE_SLOT_CONFIGURE`, que captura before/after y comprueba conexiones antes de confirmar una acción. En Electron se cambió el control real de crecimiento de 1 a 0 y se pulsaron Ctrl+Z y Ctrl+Y: la altura física alternó 166/128 cm, el código del módulo salió y volvió al BOM, y los IDs permanecieron. Una edición conectada que dejaría alturas incompatibles fue rechazada con `HEIGHT_TRANSITION_REQUIRED`; queda pendiente ejecutar con teclado una edición conectada válida.

## 12. Duplicación

**PASS automatizado para frame y secuencia, y en Electron para sistema.** Duplicar desde configuración serializable produce instanceId/frameId/moduleId nuevos y conserva cantidad, altura, códigos, BOM y total. En Electron se duplicó un sistema de dos frames crecidos mediante la API expuesta: original y copia tienen systemId, moduleId y frameId distintos, los mismos códigos BOM y el mismo total de 1.740.900 COP. El botón visual de duplicación no se pulsó en esta prueba.

## 13. Conexiones

**PASS automatizado para secuencia y rechazo real en Electron; PENDING para interacción 3D con mouse.** La secuencia reconstruida usa la altura física final al resolver junctions y kits. Una mezcla que produce alturas físicas diferentes y carece de unión validada devuelve `HEIGHT_TRANSITION_REQUIRED`; se confirmó ese rechazo en Electron al intentar retirar el crecimiento de un frame conectado. Una edición de frame conectado pasa por la transacción de slots; el validador espacial existente revisa las conexiones externas y revierte si quedan inválidas.

## 14. Smart Snap

**PASS automatizado y en Electron para contrato de puntos.** Los dos puntos terminales de una secuencia crecida reportan altura física final (128 cm en el caso interactivo), sin alterar X/Z ni orientación. El motor de Smart Snap existente consume esos puntos. **PENDING** comprobación visual de preview y marcador con movimiento de mouse en Electron.

## 15. Selección

**PASS automatizado para identidad y uso real de Properties en Electron.** La parte física del crecimiento resuelve el mismo frame raíz y frameId; el slot conserva moduleId y frameId. La edición de un frame en secuencia vuelve a seleccionarlo por su instanceId tras la transacción. En Electron se seleccionó el frame mediante la API expuesta y se editó desde el control real de Properties. **PENDING** selección mediante mouse en vista 3D y panel de composición.

## 16. Pruebas

**PASS dirigido: 22/22.** `test/critteriumCommercialGrowthPhase10_1.test.js` cubre PT/precios reales, configuración válida e inválida, altura, geometría, BOM, cotización, guardado/reconstrucción, estados de Undo/Redo, duplicación de frame/secuencia, conexiones, puntos para Smart Snap y selección física. Los tests existentes de composición, slots, configurador y Smart Layout pasan. La nueva prueba está incluida en `npm test`. `electron/phase101-growth-validation.cjs` ejecutó el recorrido real descrito arriba y terminó sin errores.

## 17. Regresiones

`npm test`: 382 pruebas, 351 pasan y 31 fallan. La línea base de Fase 10 era 376/345/31; las seis pruebas nuevas pasan y no aumenta el número de fallos. Los fallos permanecen en KONCISA, LINK y LOCKERS. `npm run build`: pasa, 897 módulos transformados; advierte que Node 20.17.0 está por debajo del requisito declarado por Vite y sobre chunks grandes. `npm run lint`: 117 errores y 8 advertencias, los mismos totales de la línea base; no aparecen diagnósticos para los archivos CRITERIUM modificados. `git diff --check`: pasa, solo advierte sobre conversión LF/CRLF.

## 18. Limitaciones

**PENDING** cierre total y reinicio del proceso Electron, selección 3D con mouse, preview visual de Smart Snap y pulsación del botón visual para duplicar sistema. El recorrido Electron automatizado sí validó controles de crecimiento, teclado Undo/Redo, exportación/importación y duplicación mediante API. No se habilita un kit de cambio de altura sin resolver. Si el usuario cambia ancho/altura de un frame crecido a una combinación sin código, el configurador lo rechaza hasta retirar el módulo. El mapa no aporta acabado individual para este componente. No se editaron XML ni catálogos.

## 19. Siguiente brecha priorizada

**PRIORIDAD 2:** bisel superior, porque existe físicamente en el flujo y hay PT con precio, pero hoy es parte simbólica y no tiene resolución comercial completa en el catálogo del código; queda sin implementar por la prohibición de modificar catálogos. **PRIORIDAD 3:** tapas de zócalo y ductos, por cobertura incompleta de precio/compatibilidad. **NO IMPLEMENTAR:** puertas y acabados individuales sin respaldo específico. No se abrió una segunda familia en esta fase.

## 20. Resultado final

**PARTIAL en validación visual.** El crecimiento de 38 cm recorre fuente → configurador → frame/slot → geometría → BOM → cotización → datos persistidos → reconstrucción/duplicación. Electron confirmó controles reales, Ctrl+Z/Ctrl+Y, importación, duplicación por API y rechazo de edición conectada inválida. La selección 3D con mouse, el preview de Smart Snap, el botón visual de duplicación y el reinicio completo de Electron siguen pendientes; por ello no se declara cerrada toda la Fase 10.1. No se hizo commit ni push.

## Validación interactiva final

La segunda ejecución de Electron usó clics de mouse y teclas sobre los controles del configurador. Creó desde **Sistema** una secuencia de dos frames de 128 cm, seleccionó crecimiento de 38 cm en ambos selectores con teclado y pulsó **Crear sistema con 1 secuencia(s)**. La inspección posterior mostró dos slots de 166 cm con `growth=1`. Pulsó **Seleccionar frame del módulo** y **Duplicar sistema completo**; aparecieron dos `systemId` distintos y la copia mantuvo dos slots crecidos con IDs de frame y módulo nuevos. La captura `electron/phase101-growth-ui-system.png` muestra los dos frames y la franja superior de crecimiento, pero una captura aislada no prueba todo el movimiento ni la ausencia de deformaciones desde otros ángulos.

| Prueba | Resultado | Evidencia |
|---|---|
| Crear módulo | PASS | Botón real de crear sistema; dos slots físicos nuevos de 128 cm antes de crecimiento en el borrador. |
| Activar 38 cm | PASS | Dos selectores reales operados con teclado; sistema creado con `growth=1` y 166 cm en ambos slots. |
| Desactivar 38 cm | PARTIAL | Properties en Electron retiró el módulo de un frame aislado; falta escenario conectado válido. |
| BOM | PARTIAL | Pruebas automatizadas y recorrido anterior de Electron por API; falta comparación antes/después del sistema creado con botones. |
| Cotización | PARTIAL | XML y total comprobados con API en Electron anterior; falta generar ambas cotizaciones con controles visibles. |
| Undo | PARTIAL | Ctrl+Z real funcionó en frame aislado; falta repetir en sistema conectado. |
| Redo | PARTIAL | Ctrl+Y real funcionó en frame aislado; falta repetir en sistema conectado. |
| Smart Snap | PENDING | No se ejecutó arrastre real de secuencias con marcador y preview. |
| Rotación | PENDING | No se probaron 0°, 90°, 180° y 270° en el sistema crecido. |
| Movimiento | PENDING | No se movieron frame, secuencia y sistema mediante mouse. |
| Conexión | PARTIAL | La secuencia creada tiene encuentros internos; rechazo `HEIGHT_TRANSITION_REQUIRED` confirmado en Electron por API. Falta crear conexión externa con mouse. |
| Persistencia | PARTIAL | Exportación/importación real por API comprobada; falta Archivo → Guardar, cerrar ventana y reabrir proyecto. |
| Duplicación | PARTIAL | Botón real **Duplicar sistema completo** comprobado con nuevos IDs y crecimiento conservado; falta duplicar módulo y secuencia mediante UI. |
| Selección | PARTIAL | Botón real **Seleccionar frame del módulo** pulsado; falta verificar selección bidireccional con clic 3D. |
| Caso inválido | PARTIAL | Edición conectada incompatible fue rechazada por API; falta provocar el rechazo desde Properties y confirmar mensaje visible. |

**Estado: PENDING para el cierre de Fase 10.1.** La integración visual de Smart Snap, movimiento, rotación y persistencia con reinicio de Electron sigue sin evidencia interactiva suficiente. No se identificó un bug reproducible nuevo en los recorridos ejecutados; no se cambiaron reglas comerciales.

La regresión ejecutada nuevamente dio `npm test`: 382 pruebas, 351 PASS y 31 FAIL, sin incremento frente a la línea base; las seis pruebas nuevas de crecimiento siguen pasando. Los 31 fallos corresponden a pruebas de KONCISA, LINK y LOCKERS; entre las causas registradas figuran una importación sin extensión en KONCISA y discrepancias de dimensiones de LINK. `npm run build` pasa (897 módulos; advertencias de versión de Node y chunks grandes). `npm run lint` conserva 117 errores y 8 advertencias. `git diff --check` pasa. Una búsqueda en `src/mepal/critterium8` no encontró referencias a MULTIPLE, KONCISA, LINK, VETRO ni LOCKERS.

## Validación final 10.1.1

`PASS instrumental` significa que Electron recibió clics, teclas o arrastres y se inspeccionó el estado resultante; no equivale a una revisión visual humana. Los puntos de arrastre se calcularon proyectando meshes y terminales con la cámara activa. Una ventana flotante de Properties interceptó inicialmente el arrastre normal–normal; se corrigió el guion para tomar el borde superior del frame y se repitió exitosamente.

| Escenario | Resultado | Tipo de evidencia | Observaciones |
|---|---|---|---|
| Crecimiento 38 cm | PASS instrumental | UI Electron y test | Selectores con teclado; dos slots `growth=1`. |
| Altura | PASS instrumental | UI Electron y test | Ambos slots quedan en 166 cm. |
| BOM | PARTIAL | Tests e inspección anterior | Falta comparación completa después de cada interacción y reapertura. |
| Cotización | PARTIAL | Tests e inspección anterior | Falta comparación desde UI y después de reapertura. |
| Undo | PARTIAL | Recorrido anterior y test | Falta secuencia conectada completa. |
| Redo | PARTIAL | Recorrido anterior y test | Falta secuencia conectada completa. |
| Smart Snap | PASS instrumental parcial | Arrastre nativo Electron | NN y GG crean LINEAR; NG y GN rechazan mezcla de alturas; marcador verde o rojo observado en escena. Falta inspección visual humana y demás variantes. |
| Smart Snap 300 mm | PENDING | Ninguna | Falta control preciso de distancia mundo. |
| Smart Snap >300 mm | PENDING | Ninguna | Falta control preciso de distancia mundo. |
| Smart Snap zoom | PENDING | Ninguna | No se repitió con tres niveles de zoom. |
| Rotación | PENDING | Ninguna | No se ejecutó matriz 0°/90°/180°/270°. |
| Movimiento frame | PASS instrumental parcial | Arrastre nativo Electron | Un frame se movió con alcance Pieza individual; falta comparación completa de IDs, BOM y cotización. |
| Movimiento secuencia | PASS instrumental parcial | Arrastre nativo Electron | La secuencia móvil se trasladó y la otra permaneció fija en los escenarios de Snap; falta comparación comercial. |
| Movimiento sistema | PASS instrumental parcial | Arrastre nativo Electron | Sistema y frames se trasladaron juntos; falta comparación completa de IDs y BOM. |
| Selección 3D→panel | PASS instrumental parcial | Clic real Electron | Clic en módulo crecido abrió Properties y permitió editar; faltan niveles sistema, secuencia y parte tras rotación. |
| Panel→3D | PARTIAL | Botones reales Electron | Selección de secuencia y frame; falta comprobar resaltado de todos los niveles. |
| Properties | PARTIAL | Clic y teclado Electron | Control alcanzable; falta ciclo válido 38 cm → normal → 38 cm conectado. |
| Caso inválido | PASS instrumental parcial | Properties real Electron | Intentar retirar crecimiento de un módulo de secuencia crecida mostró `HEIGHT_TRANSITION_REQUIRED`; ambos slots conservaron 166 cm. Falta comparación BOM/cotización. |
| Guardar | PENDING | Ninguna | Falta Archivo → Guardar del escenario conectado y rotado. |
| Cerrar/Reabrir | PENDING | Ninguna | Falta cerrar Electron y abrir el archivo guardado. |
| BOM post-reapertura | PENDING | Ninguna | Depende de la reapertura. |
| Cotización post-reapertura | PENDING | Ninguna | Depende de la reapertura. |

**Bug reproducido y corregido:** al clicar un módulo crecido en 3D, Properties mostraba el frame, pero el callback de edición buscaba la selección activa de sistema/secuencia y devolvía `CRITTERIUM8_ASSEMBLY_REQUIRED`. Los callbacks ahora reciben el `instanceId` del frame mostrado; la repetición desde el control real muestra el diagnóstico esperado `HEIGHT_TRANSITION_REQUIRED` y no cambia ninguno de los dos slots. Cambiaron `ThreeCanvas.jsx` y `Critterium8Properties.jsx`; `electron/phase101-growth-ui-validation.cjs` comprueba el caso.

La ejecución actual de `npm test` sigue en **351/382** (31 fallos). Las pruebas CRITERIUM, incluidas las seis nuevas, pasaron. El conteo coincide con la línea base de Fase 10.1; no se conservó un listado anterior de nombres de los 31 fallos para afirmar igualdad caso por caso. `npm run build` pasó (897 módulos; avisos de Node 20.17 y tamaño de chunks), `npm run lint` terminó con 117 errores y 8 advertencias globales, y `git diff --check` pasó.

**FASE 10.1 = PENDING.** Siguen sin ejecutarse rotaciones, límites de Snap, zoom, guardar/cerrar/reabrir y comparaciones completas de BOM y cotización.
