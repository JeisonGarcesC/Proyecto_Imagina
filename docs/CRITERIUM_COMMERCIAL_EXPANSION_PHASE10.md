# Fase 10 — Expansión comercial y funcional de CRITERIUM 8

## 1. Estado inicial

Auditoría del estado local del 14 de octubre de 2026. La Fase 9.3 mantiene validaciones interactivas 3D pendientes; esta fase no las retoma. Ya existen sistema, secuencias, slots, frames, biblioteca, BOM, cotización, historial y persistencia. Este documento distingue soporte geométrico de respaldo comercial. **La Fase 10 no queda terminada con esta auditoría.**

## 2. Fuentes auditadas

- `public/assets/MapaProductoYFichasTecnicas/Critterium8/Criterium.pdf`, mapa de producto, 27 páginas. Se revisaron especialmente marcos (p. 5 y 8), crecimiento (p. 6), baldosas (p. 9–17), uniones (p. 18–24) y llegadas a pared (p. 25–26).
- `public/assets/MapaProductoYFichasTecnicas/Critterium8/Ficha tecnica criterium.pdf`, 11 páginas. Se revisaron estructura, materiales, uniones, ductos y electricidad.
- `public/data/xml/ptsinbom_4.xml` y listas de precios CO/EUC/USD utilizadas por `critteriumPriceCatalog.js`. El XML ya estaba modificado en el árbol de trabajo antes de esta auditoría; las cifras son una fotografía de ese estado, no una edición de esta fase.
- `src/mepal/critterium8/catalog`, `parts`, `composition`, `junctions`, `bom`, `commercial`, `integration`, `system`, `ui`, y `src/components/CriteriumPanel.jsx`.
- Auditorías anteriores: `docs/CRITERIUM_COMMERCIAL_QUOTATION_PHASE7.md` y `docs/CRITERIUM_CATALOG_MATRIX_PHASE7_2.csv`.

Los scripts `scripts/auditCritteriumPhase10Pdf.mjs` y `scripts/auditCritteriumPhase10Xml.mjs` permiten repetir la extracción y el conteo; no modifican fuentes comerciales.

## 3. Inventario comercial

El XML/PT contiene 6.050 registros, 439 rotulados exactamente `CRITTERIUM 8`, de los cuales 354 están activos y tienen 354 códigos distintos. Los catálogos actuales de código incluyen 131 códigos de esta línea; no significa que todas sus combinaciones sean seleccionables o estén siempre en el BOM. La lista CO está en COP; las listas EUC y USD están en USD. La presencia de un precio en XML no demuestra por sí sola que exista la geometría, la regla de instalación ni la relación de componentes.

Entre los PT activos figuran 228 kits de uno a cuatro paneles, 53 marcos rectos, 18 montantes, 4 módulos de crecimiento, 5 marcos y 5 baldosas de recepción, además de bandejas, tapas, biseles, cintas, zócalos y ductos. Algunos descriptores dicen `LINK`, `MULTIPLE` o `CRITTERIUM` juntos: la etiqueta de línea exacta no autoriza trasladar reglas de esas otras familias.

## 4. Matriz de cobertura

`PDF` significa evidencia de familia; `XML` es el PT activo exacto cuando se conoce. `Código` significa representación actual, no todas las variantes. `Precio` indica cobertura encontrada en CO, salvo indicación contraria.

| Familia | PDF | XML/PT | Código | Configurable ahora | BOM | Precio | Estado |
|---|---|---|---|---|---|---|---|
| Marcos rectos media altura | Mapa p. 5 | 53 rectos activos, 36 con precio CO | 30 combinaciones base catalogadas | Ancho, alto y composición documentada | Código de frame según combinación | Parcial | PARCIAL |
| Montantes / marcos a techo | Mapa p. 8; ficha p. 1 | 18 montantes activos, 18 CO | 18 códigos | Modo a techo y altura | Poste y U cuando corresponde | U de techo con brecha EUC documentada en Fase 7.2 | PARCIAL |
| Postes, travesaños, bisel y niveladores internos | Ficha p. 1–3 | Biseles 7; travesaño toma 1; postes internos sin correspondencia autónoma completa | Partes estructurales, algunos sin código | Indirectamente por frame | Partes derivadas con diagnóstico si falta código | Parcial | PARCIAL |
| Baldosa fórmica | Mapa p. 9; ficha p. 2 | Códigos en mapa; no equivalencia completa de PT activo | Tabla comercial actual | Tipo y dimensiones por slot compatible | Código si hay combinación | Según código/lista | PARCIAL |
| Baldosa textil Gama 1/2 | Mapa p. 10–11; ficha p. 3 | Referencias de gama en mapa; correspondencia PT a revisar | Tipo geométrico `FABRIC`, sin tabla de códigos por gama | Tipo genérico, sin gama comercial | Sin código para esa selección | No cotizable de forma fiable | NO SOPORTADO COMERCIALMENTE |
| Baldosa metálica lisa/perforada/embosada | Mapa p. 12, 14–16; ficha p. 2 | Referencias en mapa; correlación PT pendiente | Geometría de tipos, sin catálogo comercial de baldosa | Tipo geométrico | Falta código | No cotizable de forma fiable | NO SOPORTADO COMERCIALMENTE |
| Vidrio sencillo, acústica y pasadocumentos | Mapa p. 13 y 17; ficha p. 2–3 | Cobertura comercial desigual | Tipos geométricos disponibles | Tipo geométrico | Falta código en tipos distintos de fórmica | No cotizable de forma fiable | NO SOPORTADO COMERCIALMENTE |
| Crecimiento 38 cm | Mapa p. 6; ficha p. 1 | 4 módulos activos; 4 CO | Regla, código y constructor para 60/75/90/120 | No hay selector comercial completo | Se incluye si `growthModules` llega al constructor | Sí para los 4 | PARCIAL |
| Zócalo y tapas | Mapa/ficha p. 3 | 8 tapas activas sin CO; 4 kits intermedios con CO | Zócalo estructural; tapas no catalogadas | No como producto comercial individual | Diagnóstico de código faltante | Parcial | PARCIAL |
| Uniones 180°, 90° y terminal | Mapa p. 18–24; ficha p. 5 | Kits de 1–4 paneles | Parte de las variantes catalogadas | Conexiones según anclajes físicos existentes | Kits derivados de conexiones válidas | Parcial | PARCIAL |
| Uniones T, X, 45°/135°/120° | Mapa p. 18–24; ficha p. 5 | Kits activos | Algunos códigos T/X; otras variantes sin catálogo | T/X sin anclaje físico validado; ángulos especiales sin regla física | No deben derivarse de unión no validada | XML tiene varios precios | NO SOPORTADO POR LA GEOMETRÍA ACTUAL |
| Llegadas a pared y ductos bajantes | Mapa p. 25–26; ficha p. 6 | Kits de pared; 3 bajantes activos con CO | Cobertura parcial o ausente | Sin configuración comercial completa | No derivación fiable | Parcial | PARCIAL |
| Recepción e integraciones | Ficha p. 4 | 5 marcos y 5 baldosas de recepción activos con CO | Sin modelo de configuración completo | No | No | Sí en CO para esos PT | FALTA |
| Puertas | No se encontró puerta CRITERIUM 8 en ambos PDF | Ninguna puerta en los 439 registros exactos | Diagnóstico de ausencia | No | No | No | NO DOCUMENTADO / NO IMPLEMENTAR |
| Materiales | Ficha p. 1–3: lámina, vidrio, fórmica, tela, etc. | Campo material, a veces `INDEFINIDO` | Metadatos parciales | Tipo de baldosa, no referencia completa | Metadatos cuando existen | No precios por selección de material arbitrario | PARCIAL |
| Acabados y colores | Descripciones genéricas, sin tabla inequívoca de código/color/precio | Sin catálogo de acabados de esta línea validado | Color visual separado | No selección comercial validada | `FINISH_UNCONFIRMED` si procede | No cotizable como acabado | NO DOCUMENTADO / NO IMPLEMENTAR |
| Dimensiones, alturas, anchos y profundidad | Ficha p. 1: profundidad estructural 8 cm; anchos 30–150; mapa detalla combinaciones | Subconjunto con códigos | Subconjunto validado por reglas | Opciones de frame actuales | Según código disponible | Por código concreto | PARCIAL |
| Configuraciones especiales y electricidad | Ficha p. 4, 6–11 | Referencias y kits heterogéneos | Sin contrato completo por opción | No de forma comercial verificable | No derivación completa | Parcial | NO SOPORTADO COMERCIALMENTE |

Los conteos XML por familia reproducibles están en la salida de `scripts/auditCritteriumPhase10Xml.mjs`. No se equipara “aparece en PDF” con “implementable”.

## 5. Brechas encontradas

1. El configurador ofrece tipos visuales de baldosa distintos de fórmica sin resolver código comercial; la cotización debe conservar el diagnóstico.
2. Crecimiento tiene código y lógica, pero el usuario no puede elegirlo de extremo a extremo en el flujo habitual. El constructor transforma la composición a la altura final, mientras la definición base mantiene la altura inicial; antes de exponerlo habría que validar selección, geometría, persistencia y reconstrucción con ese contrato.
3. Gran parte del XML/PT incluye variantes no presentes en los catálogos actuales. La prohibición de editar catálogos impide incorporarlas en esta fase.
4. T/X y ángulos especiales requieren anclajes físicos y reglas de conexión probadas; el precio del kit no resuelve esa falta.
5. La ficha técnica describe materiales y aplicaciones, pero no identifica una matriz inequívoca de acabado comercial/color/precio.
6. El mapa p. 8 repite para un montante de 242 cm una referencia que los PT asignan a media altura de 110 cm. Mantener la resolución PT actual y registrar la discrepancia; no inferir equivalencia.

## 6. Funcionalidades seleccionadas

**IMPLEMENTADO:** mantener los flujos comerciales existentes de frames, fórmica y kits que ya cuentan con reglas. **PARCIAL:** crecimiento documentado de 38 cm se conserva como capacidad interna, sin activar un control nuevo hasta validar su contrato de altura y persistencia. No se seleccionó ninguna nueva opción de producto para implementación en esta etapa: las opciones comerciales faltantes necesitan editar catálogos (prohibido aquí) o resolver geometría/reglas sin evidencia suficiente. No se hicieron cambios funcionales de CRITERIUM.

## 7. Funcionalidades descartadas

- **NO IMPLEMENTAR:** puertas, acabados de color y herrajes sin respaldo específico.
- **NOT_SUPPORTED:** conexiones T/X, 45°/135°/120° como nuevas opciones espaciales sin anclaje validado.
- **NO SOPORTADO COMERCIALMENTE:** selector de telas, metal, vidrio, recepción, ductos y electricidad que pudiera cotizar una variante sin código y composición confirmados.
- **PARCIAL:** crecimiento, pendiente de validación integral antes de ofrecerlo al usuario.

## 8. Arquitectura

Se mantiene `CRITERIUM_SYSTEM → CRITTERIUM_8_SEQUENCE → slots → CRITERIUM_8 → partes → BOM → cotización`. El frame físico es fuente de su configuración y partes; el slot de secuencia conserva identidad y ubicación. No se propuso estado comercial paralelo ni dependencia de MULTIPLE, LINK, KONCISA, VETRO o LOCKERS.

## 9. Configuración comercial

El usuario ya puede modificar ancho, alto, modo de frame, modo de composición y tipo geométrico de baldosa. La validez geométrica de un tipo no garantiza un código. Cualquier control comercial nuevo necesita vincular variante exacta, dimensiones permitidas, material y precio por medio de las tablas vigentes; hoy esto solo está completo para un subconjunto.

## 10. Slots

`sequenceModuleSlots.js` identifica el frame por slot y conserva ancho, alto y modo; la configuración comercial detallada vive en el frame asociado. Duplicar material/acabado en el slot crearía dos fuentes de verdad. La cadena slot → frame → partes → BOM se conserva.

## 11. Materiales

La ficha documenta familias de lámina, fórmica, tela y vidrio. El XML contiene un campo de material, incluso valores `INDEFINIDO`. Un material visual no equivale a una referencia comercial específica. No se agregaron selecciones de material.

## 12. Acabados

No se encontró tabla verificable que relacione color/acabado individual con código comercial y precio de CRITERIUM 8. Gama textil 1/2 sí distingue baldosas con códigos distintos en el mapa, pero no define por sí misma todos los colores. Se mantiene `FINISH_UNCONFIRMED` cuando corresponda.

## 13. Puertas

No aparecen puertas CRITERIUM 8 en los dos PDF ni entre los 439 PT de la línea exacta. Se mantiene `CRITERIUM_DOOR_NOT_DOCUMENTED`. No se usan datos de CRITERIUM 6 ni de otras líneas.

## 14. Accesorios

La ficha muestra ductos, zócalos, pasacables, electricidad, integraciones y recepción. Algunos tienen PT y precio, pero carecen de contrato completo de compatibilidad y/o representación actual. No se exponen como accesorios seleccionables ni se insertan en BOM por inferencia.

## 15. BOM

`critterium8BOM.js` y el resolvedor de partes se basan en configuración y partes, no en meshes. Una baldosa geométrica sin código conserva `MISSING_DOCUMENTED_CODE` y no debe adquirir uno supuesto. No se alteró el BOM.

## 16. Cotización

`critteriumQuotation.js` consume líneas de BOM y `critteriumPriceCatalog.js` lee listas comerciales. Mantener `CODE_WITHOUT_PRICE`, `FINISH_UNCONFIRMED` y el diagnóstico de cambio de catálogo donde ya se produzca. Un precio aislado de XML no autoriza emitir una línea sin composición comercial validada.

## 17. Biblioteca

La biblioteca existente reutiliza constructores y configuraciones de CRITERIUM. No se agregan presets: un nuevo nombre de preset no demostraría equivalencia de BOM y precio sin una configuración comercial nueva, completa y documentada.

## 18. Persistencia

Las entidades serializables existentes preservan IDs, configuraciones, slots y transformaciones. Sin campo nuevo no hace falta migración. Para exponer crecimiento después, comprobar base/final, tiles, IDs y BOM tras guardar y reabrir; no persistir Object3D.

## 19. Historial

El historial global ya cubre operaciones del configurador. No se agregó edición comercial nueva, por lo que no se registran acciones adicionales. Una futura selección comercial debe generar una sola acción completa y poder revertirse.

## 20. Pruebas

La auditoría compara PDF, PT activo, tablas del código y listas de precios. No se afirma equivalencia manual/biblioteca para familias no implementadas. `npm test`: 376 pruebas, 345 pasan y 31 fallan. Ninguna de las 31 fallidas es una prueba CRITERIUM. `npm run build`: pasa, 897 módulos transformados, con advertencias de Node 20.17.0 frente al mínimo de Vite (20.19+) y de tamaño de chunks. `npm run lint`: 117 errores y 8 advertencias en el árbol actual. `git diff --check`: sin errores de espacios; Git solo avisó de conversión LF/CRLF en archivos preexistentes.

## 21. Regresiones

No se modificaron módulos de producto, XML, catálogos ni otras líneas durante esta etapa; por tanto, la auditoría no introduce un cambio funcional. Los 31 fallos de `npm test` se distribuyen en KONCISA (incluido un archivo de prueba que falla al cargar), LINK y LOCKERS. No se atribuyen a esta auditoría porque no se cambió código de esas líneas, pero el árbol ya tenía modificaciones ajenas y no se estableció una línea base limpia para probar su antigüedad.

## 22. Limitaciones

La etiqueta `CRITTERIUM 8` del XML se usa literalmente; algunas descripciones mezclan nombres de familias. Los PDF describen más variantes de las que el catálogo actual codifica. La extracción textual no prueba por sí misma reglas de montaje, acabado ni interacción 3D. La geometría no valida T/X ni todas las conexiones del mapa. La prohibición de editar catálogos y XML excluye completar las tablas comerciales faltantes en esta fase.

## 23. Resultado

Auditoría comercial realizada y matriz de cobertura creada. **Estado: PARCIAL.** No se activa ninguna funcionalidad comercial nueva sin evidencia y contrato completo. Próximo trabajo seguro, en una fase que permita catálogos: reconciliar variante por variante PDF/PT/precio, resolver la discrepancia de montante 242 y probar crecimiento de extremo a extremo antes de ofrecerlo en la interfaz. Las puertas permanecen **NO DOCUMENTADO / NO IMPLEMENTAR**.
