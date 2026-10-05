# Fase 7 — Cotización comercial CRITERIUM (parcial)

## Auditoría de fuentes

`resolveCritterium8BOM` es la fuente de componentes: registra frames con código documentado, baldosas, módulos de crecimiento, piezas a techo y kits de unión documentados. Cada fila lleva código, cantidad, descripción, referencia y códigos de material/acabado cuando existen; los componentes sin código producen diagnósticos. El sistema físico, las conexiones espaciales y los nodos no aportan filas comerciales.

`ptsinbom_4.xml` aporta descripciones y material comercial de PT cuando existe. Los XML `PriceList_CO_2.xml`, `Pricelist_EUC_2.xml` y `PriceList_USD_2.xml` aportan `Codigo`, `Precio` y `Moneda`. El archivo CO declara COP; EUC y USD declaran USD. La lectura comercial específica conserva la moneda documentada y distingue ausencia de precio, precio cero y registros contradictorios. Los códigos `22191900011`, `22000014321` y `22191900127` del BOM observado en una oficina de prueba aparecen en la lista CO. Esto no demuestra cobertura de todas las configuraciones.

## Flujo comercial

La cotización es una proyección independiente: `CRITERIUM_SYSTEM` → `resolveCritterium8BOM` → agrupación por código, referencia, material y acabado → precio documentado del XML seleccionado. No recorre meshes ni cambia el BOM global. El material comercial proviene del BOM o del registro PT; no se convierte un material visual en comercial. El acabado solo se considera documentado cuando el BOM tiene `finishCode`; la interfaz indica `ACABADO NO VALIDADO` en caso contrario. No se infieren códigos ni referencias.

Cada línea recibe `PRICED`, `CODE_WITHOUT_PRICE`, `NO_COMMERCIAL_CODE` o `COMMERCIAL_AMBIGUOUS`. Los componentes sin código expuestos por el diagnóstico del BOM aparecen como líneas pendientes, sin importe ficticio. El subtotal y total suman únicamente líneas con precio confirmado; el total se marca parcial si falta información. No se agrega IVA porque no se encontró una regla tributaria documentada en estas fuentes. La moneda se lee del XML; si no está, se muestra `CURRENCY_UNCONFIRMED`.

El LeftPanel ofrece BOM, resumen de sistema, cotización y exportación JSON. El resumen presenta secuencias, módulos, puertas detectadas en el BOM, conexiones, longitud y recintos. Una vista previa textual enumera secuencias y conexiones; no calcula precios. Abrir vistas o exportar no añade historial. La exportación JSON contiene sistema, fecha de generación, filas, códigos, referencias, cantidades, material, acabado, precio unitario, subtotal, total, moneda y diagnósticos. Excel y PDF quedan preparados como destinos futuros, sin formato inventado en esta fase.

## Persistencia y cambios de catálogo

Al calcular una cotización se guarda opcionalmente un snapshot comercial en la entidad `CRITERIUM_SYSTEM`. Al reabrir, la cotización vuelve a consultar el XML actual; el snapshot solo se usa para comparar. Un precio distinto en la misma moneda produce `COMMERCIAL_CATALOG_CHANGED`; un conjunto de códigos distinto produce `COMMERCIAL_CODE_CHANGED`; un cambio de moneda se informa aparte. La geometría nunca se modifica a partir de un snapshot comercial. Si no se generó una cotización antes de guardar, no existe una línea base para comparar el catálogo.

## Pruebas y límites

`test/critteriumQuotationPhase7.test.js` verifica lectura de moneda, ambigüedad, agrupación, materiales, acabados, faltantes, subtotal, total sin IVA, exportación JSON, cambio de catálogo y persistencia del snapshot con un BOM físico CRITERIUM. La comparación integral de una oficina con puertas y dos acabados documentados queda pendiente: el repositorio no demuestra aún esas dos variantes comerciales en una sola configuración. La etiqueta de configuración completa describe cobertura de códigos, precios y moneda; no certifica acabados que no estén documentados.

Se ejecutó una prueba en Electron con la interfaz real: crear sistema y secuencia, abrir cotización, exportar JSON, agregar un módulo, volver a cotizar, guardar, cerrar y reabrir. La cotización inicial tuvo 3 líneas y total COP 1.512.000; tras agregar el módulo, el total fue COP 2.160.900. El proyecto guardó el snapshot comercial y el JSON recotizado tras reabrir fue idéntico al anterior. Esta prueba cubre ese recorrido concreto, no todas las variantes de oficina.

Las cinco pruebas nuevas de Fase 7 pasaron. En la ejecución completa hubo 365 pruebas: 336 pasaron y 29 fallaron fuera de Fase 7. `npm run build` terminó correctamente, con avisos de versión de Node y tamaño de chunks. `npm run lint` falló con 150 errores y 9 advertencias generales del repositorio; la revisión focalizada no encontró errores nuevos en los módulos de cotización. `git diff --check` pasó.

La cobertura de todos los códigos CRITERIUM, una oficina con puertas y dos acabados comerciales documentados, y un ciclo guardar/reabrir tras modificar realmente el XML de precios siguen pendientes. Hasta completarlos, la Fase 7 permanece **PARCIAL**.

## AUDITORÍA DE CIERRE 7.1

La matriz automatizada reúne los códigos de marcos, montantes a techo, módulos de crecimiento, baldosas fórmica con código, U a techo y kits de unión. Son 131 códigos únicos documentados por estas fuentes. Cada código se consulta contra los tres XML reales; la prueba se puede repetir con `node --test test/critteriumCommercialAuditPhase7_1.test.js`.

| Grupo auditado | Código | Referencia | Material | Acabado | Precio CO / EUC / USD | Moneda | Estado |
|---|---|---|---|---|---|---|---|
| Marcos, crecimiento, fórmica y kits con código | 130 códigos distintos | No consta en el catálogo de códigos | Según BOM o MATERIAL de PT, cuando exista | No hay tabla de acabados comerciales validada | 130 / 130 / 130 | COP / USD / USD | PRICED en las tres listas; FINISH_UNCONFIRMED si el BOM no aporta acabado documentado |
| U a techo | `22191200755` | No consta | Según BOM o PT, cuando exista | No validado | Sí / no / sí | COP / USD / USD | CODE_WITHOUT_PRICE en EUC |
| Otros tipos de baldosa permitidos por geometría | Sin código comercial documentado en el catálogo CRITERIUM actual | No consta | No inferido | No validado | No atribuible | No atribuible | NO_COMMERCIAL_CODE cuando el BOM los emite |
| Puerta CRITERIUM | No existe tipo/configurador de puerta en la implementación actual | No consta | No consta | No consta | No atribuible | No atribuible | No se puede generar ni clasificar una puerta real |

La matriz indica presencia de precio, no validez comercial universal de toda combinación de altura, ancho, baldosa y unión. Las dimensiones permitidas y las variantes codificadas no son idénticas: las combinaciones sin entrada comercial deben conservar el diagnóstico existente del BOM. `COMMERCIAL_AMBIGUOUS` y `CURRENCY_UNCONFIRMED` se verifican en las pruebas del lector y aparecen si la fuente contiene precios contradictorios o carece de moneda; no aparecieron en los 131 códigos de las listas actuales. No se cambió ningún código ni XML.

**Puertas y acabados.** La búsqueda en el código de CRITERIUM no encontró definición, constructor ni opción de puerta. El contador de puertas del resumen depende de descripciones del BOM y no constituye una prueba de puerta. El BOM admite `finishCode` recibido de la configuración, pero las fuentes auditadas no prueban que dos valores de acabado correspondan a dos acabados comerciales distintos para una oficina real. No se usaron colores visuales como sustituto. La prueba integral con puerta y dos acabados queda pendiente por falta de soporte y datos documentados.

**Trazabilidad y cambios.** La prueba 7.1 conserva código, referencia, descripción, cantidad y `sourceIds` de una fila BOM en la cotización, y comprueba precio unitario, subtotal y JSON sin objetos Three.js. Una copia en memoria del XML CO cambia en una unidad el precio de un código CRITERIUM real: la nueva cotización cambia en dos unidades para cantidad dos y emite `COMMERCIAL_CATALOG_CHANGED` con precios anterior y actual. El archivo original permanece idéntico. Un cambio de código emite `COMMERCIAL_CODE_CHANGED`; el snapshot ahora también diagnostica cambios de referencia, material y acabado con `COMMERCIAL_METADATA_CHANGED`. La cotización vigente sigue consultando el catálogo actual.

**Persistencia, actualización y Electron.** La prueba anterior en Electron verificó creación, cotización, crecimiento, guardado, reapertura y equivalencia del JSON al recotizar. Las pruebas de Fase 7 verifican serialización/restauración del snapshot. En 7.1 no se ejecutó una nueva sesión de Electron con puerta o dos acabados porque esas variantes no están demostradas en CRITERIUM. Queda pendiente una validación integral con cambios de composición, eliminación de slot, cambio de altura y comparación de BOM antes/después en la interfaz.

**Estado:** Fase 7.1 parcial. La cobertura de códigos y la detección de cambios reales de precio están auditadas; faltan puerta, dos acabados comerciales respaldados y la validación integral solicitada de esas variantes.

**Validación 7.1.** `npm test`: 368 casos, 339 pasaron y 29 fallaron. Los 29 fallos listados son de KONCISA, LINK y LOCKERS; el total de fallos coincide con el previo a 7.1. Las tres pruebas nuevas de auditoría pasaron. `npm run build` pasó con advertencias de versión Node y tamaño de chunks. `npm run lint` mantiene 150 errores y 9 advertencias generales; ESLint sobre los dos archivos de código/pruebas tocados en 7.1 pasó. `git diff --check` pasó. No se modificaron XML ni archivos de otras líneas en esta fase.

## FASE 7.2 — AUDITORÍA DEFINITIVA DE CATÁLOGO

### Fuentes y alcance

Se revisaron los PDF locales `public/assets/MapaProductoYFichasTecnicas/Critterium8/Criterium.pdf` (27 páginas) y `Ficha tecnica criterium.pdf` (11 páginas), los XML `ptsinbom_4.xml`, `ptbom_1.xml` y las tres listas de precios, los catálogos y constructores CRITTERIUM 8, el panel y la documentación local. Las búsquedas generales de puerta, hoja, bisagra, cerradura, acabado, color, material y CRITTERIUM en otros módulos no se tomaron como relación comercial con esta línea.

La auditoría 7.1 de **131 códigos** era la cobertura del configurador actual, no de todos los PT de CRITTERIUM 8. En `ptsinbom_4.xml` hay 439 registros marcados exactamente `CRITTERIUM 8`, de los cuales 354 están activos y tienen 354 códigos únicos. Los registros `CRITTERIUM 6` y `CRITTERIUM` sin versión quedan fuera. Los 131 códigos del configurador coinciden con 94 PT activos; 37 se documentan en el mapa y las listas de precios pero no tienen PT activo; otros 260 PT activos todavía no están representados por el configurador. La [matriz CSV](CRITERIUM_CATALOG_MATRIX_PHASE7_2.csv) cruza los 391 códigos únicos con descripción, tipo, subtipo, plano/referencia, material PT y precio/moneda/estado por país. Se regenera con `node scripts/auditCritteriumCatalogPhase7_2.mjs`. Un precio en XML no implica que el configurador conozca cómo construir ese producto.

| Alcance | CO (COP) | EUC (USD) | USD (USD) |
|---|---:|---:|---:|
| 131 códigos que puede emitir el configurador | 131 con precio | 130 con precio | 131 con precio |
| 354 PT activos de CRITTERIUM 8 | 314 con precio | 321 con precio | 314 con precio |

El código `22191200755` (U a techo) sigue sin precio en EUC: la cotización conserva las otras líneas y muestra `CODE_WITHOUT_PRICE` y total parcial. Los faltantes de los 354 PT no se sustituyen con valores de otras listas.

### Puertas y acabados

**Decisión de puerta: caso C para CRITTERIUM 8.** Ninguno de los 439 PT de esta línea contiene puerta, hoja, bisagra o cerradura; los PDF CRITTERIUM 8 tampoco describen una puerta, y no hay constructor/configuración de puerta en su código. Las listas generales sí contienen puertas rotuladas `CRITTERIUM 6` y elementos compartidos `MULTIPLE CRITTERIUM`, pero no establecen una puerta CRITTERIUM 8 con reglas suficientes. No se incorporó ninguna. La cotización informa `CRITERIUM_DOOR_NOT_DOCUMENTED`.

| Material o producto | Acabado descrito | Código de acabado CRITTERIUM 8 | Referencia/precio de acabado | Fuente | Estado |
|---|---|---|---|---|---|
| Marco y lámina | Pintura horneable electrostática; colores de línea | No documentado | No separable del código de producto | Ficha técnica pp. 1–3 | UNCONFIRMED |
| Baldosa fórmica | Laminado y canto de línea | No documentado | Código/precio de baldosa, sin variante de color | Ficha técnica p. 2; mapa pp. 9 | UNCONFIRMED |
| Baldosa tela | Gama 1 y gama 2 con códigos de producto distintos | Sin código de tela/color individual | Códigos de producto en mapa pp. 10–11 | Mapa de producto | UNCONFIRMED como acabado; gama es variante comercial documentada |
| Vidrio | Transparente; película opcional | No documentado | No se puede asignar diferencial | Ficha técnica pp. 2–4 | UNCONFIRMED |
| Color de previsualización 3D | Color visual | Ninguno | Ninguno | Renderer | VISUAL_ONLY |

**Decisión de acabados: caso C.** Los PDF documentan procesos y gamas, pero no dos códigos de acabado seleccionables y valorables por el configurador. Los 354 PT activos tampoco tienen campos `ACABADO` o `COLOR`. Gama 1/2 no se convierte en dos colores comerciales. Un `finishCode` recibido por configuración se conserva para trazabilidad, pero se muestra `SIN VALIDAR` y genera `FINISH_UNCONFIRMED`; la cotización informa `CRITERIUM_FINISH_CATALOG_LIMITED`. Las líneas con diferente descripción/dimensión permanecen separadas aunque compartan código, evitando agrupar variantes ambiguas por el primer resultado.

### Configuraciones, discrepancias y propuesta

Las combinaciones codificadas actualmente proceden de `frameCatalog.js`, `tileCatalog.js` y `junctionPartCatalog.js`. El mapa PDF también documenta baldosas de tela por gama, lámina lisa/perforada/repujada, vidrio, puerto, montantes y llegadas a pared; muchas no tienen resolución comercial en el BOM actual. La propuesta mínima es ampliar **el catálogo propio CRITTERIUM 8**, por familias y tablas documentadas de dimensión y variante, junto con una correspondencia explícita del configurador y BOM. Cada combinación debe resolverse por familia + altura + ancho + material + variante/acabado validado. Las que no tengan correspondencia única deben producir `COMMERCIAL_AMBIGUOUS` o `NO_COMMERCIAL_CODE`. No se activaron esos productos en 7.2.

Existe una discrepancia concreta: el mapa PDF p. 8 imprime códigos de marco media altura 110 cm en la fila del montante 204–242 cm; PT y precio CO describen `22000027834` como montante 204–242 × 30 cm y `22191900222` como marco media altura 110 × 30 cm. El configurador usa el código específico del montante. Esta divergencia se documenta y no se resuelve por primer match ni alterando el XML.

La cotización continúa a partir del BOM, separa códigos/precios faltantes y no crea una puerta ni un acabado por inferencia. El snapshot persiste y al recotizar compara código, descripción, referencia, material, acabado, moneda y precio con el catálogo vigente. Las pruebas de fases 7 y 7.1 cubren exportación JSON, cambio de precio en una copia del XML, cambio de código y restauración del snapshot. La prueba previa en Electron cubrió guardar/reabrir una oficina soportada; no se fabricó un escenario Electron con puerta o dos acabados comerciales sin documentación.

**Validación 7.2 y decisión.** Cuatro pruebas nuevas verifican los PT de CRITTERIUM 8, ausencia de puerta/acabados codificados, EUC sin precio, total parcial, agrupación por dimensión y cambios simultáneos de precio y referencia. `npm test`: 372 casos, 343 pasaron y 29 fallaron, el mismo número de fallos conocido antes de 7.2 en KONCISA, LINK y LOCKERS. `npm run build` y `git diff --check` pasaron; ESLint de los archivos de código y pruebas tocados en 7.2 pasó. La Fase 7.2 puede cerrarse como **auditoría documental y estabilización comercial**: los límites de puerta y acabado están identificados y diagnosticados. La prueba funcional de la Fase 7.1 con puerta y dos acabados sigue siendo imposible con estas fuentes y no se declara ejecutada. No se modificaron XML, BOM ni catálogos de otras líneas.
