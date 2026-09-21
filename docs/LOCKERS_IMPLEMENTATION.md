# LOCKERS — implementación y validación

## Alcance

Línea independiente en LeftRail → LeftPanel, creación, propiedades, selección física del producto completo, movimiento, rotación, eliminación, copia/pegado, historial global, BOM y guardar/cargar. Coraza y componentes nativos Three.js, sin GLB. La reconstrucción conserva la raíz física, UUID, instanceId y transformación. Las operaciones de configuración registran una única acción LOCKER_CONFIG_CHANGE.

El descriptor shape2D conserva ancho, profundidad, columnas, naves y orientación. No se incorporó dibujo a Plan2DOverlay ni se utiliza Box3 como descriptor técnico. LOCKERS se excluye del snapshot 2D genérico mientras se prepara esa integración.

## Fuentes revisadas antes de implementar

- public/assets/MapaProductoYFichasTecnicas/Lockers/fichaTecnicaLocker.pdf: páginas 2 (coraza), 3 (naves) y 4 (accesorios).
- ayudaVentasLockers.xlsm: Codigos 22, Codigos 24; fórmulas E3–E9, H3–H10, C11, D14 y F11 de Locker 22/24; listas comerciales de materiales, manijas, seguridad y troquelado.
- tekRectSurface.cm: rangos de dimensión; distribución vertical y holguras de naves; manija3D2/manijaMadera3D (1877–2155); cerraduraEmbebida3D (2316–2396); reglas de perforación y ausencia de manija con cerradura de clave. Solo lectura como referencia, nunca ejecución ni incorporación al runtime.

## Catálogo y códigos

110 registros originales con código, descripción, calibre, estado y celda de origen. Incluyen 16 registros de coraza, 64 de kits de naves y 30 de accesorios entre las dos hojas. Algunos códigos de madera y accesorios se repiten entre calibres. El catálogo completo verificable está en lockerDocumentedCatalog.js; el importador es scripts/importLockerCatalog.cjs y las pruebas comparan cada registro contra su celda original.

- Coraza Cal.22: 22000128545, 22000128546, 22000128547, 22000128548, 22000128549, 22000128550, 22000128551, 22000128552.
- Coraza Cal.24: 22000129648, 22000129649, 22000129650, 22000129651, 22000129652, 22000129653, 22000129654, 22000129655.
- Kits metálicos Cal.22: 22000128553/554, 22000128561/562, 22000128563/564, 22000128565/566.
- Kits metálicos Cal.24: 22000129656/657, 22000129658/659, 22000129660/661, 22000129662/663.
- Kits embebidos activos y habilitados Cal.22: 22000128579/580, 22000128581/582, 22000128583/584.
- Kits embebidos habilitados Cal.24: 22000129666/667, 22000129668/669, 22000129670/671.
- Formica: 22000128555/556, 22000128567/568, 22000128571/572, 22000128575/576.
- Melamina: 22000128557/558, 22000128569/570, 22000128573/574, 22000128577/578.
- Entrepaño: 22000128630 (22), 22000129672 (24). Zócalos: 22000128631, 22000128632, 22000128633.
- Manijas: 22000128634, 22000128773, 22000128635, 22000128769, 22000128636, 22000128770, 22000128637.
- Seguridad: 22000128772, 22000128771, 22000129820. Visor: 22000111072.

Las parejas anteriores son abreviaciones de presentación, nunca algoritmos para construir códigos. El resolver usa los códigos completos extraídos y coincidencias exactas.

## Configuraciones soportadas y restricciones

- Calibres 22 y 24; alturas nominales 1800/2200 mm; profundidad comercial 500 mm.
- Individual: 500 mm; doble: 800/1000 mm; triple: 1000 mm.
- Metálica parche, Formica y Melamina: 1–4 naves apiladas por columna. Metálica embebida: 2–4.
- La configuración individual/doble/triple define columnas; bayCount define naves en altura. El total de puertas es columnas × bayCount.
- El Excel asigna un kit por columna (H4); C11 define su ancho de pedido. Se conserva ese ancho en el BOM y se utiliza ancho total/columnas en geometría. Un triple lleva tres kits, no un código sintetizado de kit triple.
- Troquelados TIPO_1–TIPO_4, arriba/abajo/ambos, solo en metal. LISO exige posición NO_APLICA. Formica/Melamina requieren NO_APLICA.
- Portacandado bloqueado para Formica/Melamina. Embebida requiere NO_APLICA en seguridad comercial; su herraje integrado tiene representación visual aproximada sin cobro adicional.
- Cerradura de cuatro dígitos requiere SIN_MANIJA conforme al CM. No se sustituyen valores automáticamente.
- 1 nave embebida Cal.22: códigos 22000128559/560 inactivos. Cal.24: 22000129664/665 documentados pero bloqueados por instrucción del usuario hasta confirmar la discrepancia con la lista del Excel.
- ARMSTRONG y TIMBERLINE permanecen como opciones diagnosticadas sin código independiente en el Excel. No se equiparan silenciosamente a CERRADURA o CLAVE_4_DIGITOS. Anclaje igualmente bloqueado por falta de código.
- El cuerpo incluye sus piezas soldadas; el kit de naves incluye bayCount−1 entrepaños por columna. La opción adicional del Excel agrega un entrepaño por puerta (H7=H10), facturado aparte. Los meshes nunca agregan renglones comerciales.
- Zócalo doble de más de 800 mm usa 22000128633 según E8, que también se usa en triple.

## Rangos técnicos y remates pendientes

technicalRange conserva altura 1650–2200 mm, profundidad 300–500 mm, ancho individual 300–500, doble 600–1000 y triple 900–1000.

commercialOptions está separado y limitado a nominales. El Excel sí asigna códigos nominales a remates mediante A2/E3 y notas G3/G4. La solicitud exige coincidencia exacta y no autoriza interpolar; se consultó esta discrepancia. Hasta confirmación se bloquean dimensiones no nominales, incluidos 1700/1900/2000/2100 mm. No se han habilitado remates de coraza automáticamente.

## Geometría y acabados

Jerarquía: BODY (costados, tapa, piso, espalda, tabiques y retornos), BAY_n (DOOR, HANDLE, LOCK, HINGES, PUNCHING, VIEWER opcional), SHELVES y PLINTH opcional. ANCHOR tiene constructor nativo preparado, pero no se crea comercialmente sin código. Cada componente registra rol y aproximaciones. Cada nave registra bayIndex, columna, fila, material, seguridad, manija, troquelado, instanceId, productKey y código del kit.

bodyFinish y bayFinishes[] se guardan como valores serializables. Cada panel y herraje recibe una instancia Material nueva: cambiar una nave no modifica las demás ni la coraza. Los colores editables son representaciones visuales y no códigos comerciales de acabado. Cambios de material/herraje por nave quedan preparados por jerarquía y metadata; la configuración comercial actual los aplica al kit completo.

Dimensiones reales reconstruyen geometría, sin escalar la coraza. Unidades: mm / 1000, como los otros productos nativos. X ancho, Y altura, Z profundidad; base en Y=0, centro X=0. Zócalo eleva el cuerpo 100 mm conservando heightMm comercial.

## Valores técnicos y aproximados

Documentados: rangos y calibres anteriores; MDP de 15 mm; zócalo de 100 mm; botón Ø18 × 26 mm; Schwinn de 150 mm. Formica se representa sobre el núcleo MDP: no se certifica un espesor total de laminado F8.

LOCKER_NATIVE_APPROXIMATIONS centraliza espesor visual de chapa 1.2 mm (NO equivalencia de calibre), panel metálico 2 mm, holguras, retornos, entrepaños plegados, tamaños simplificados de manijas/cerraduras/bisagras/visor/anclaje y patrones de troquelado. LOCKER_HANDLE_OFFSETS centraliza el comportamiento extraído del CM; sus offsets provienen de pivotes de assets y se tratan como referencia visual, no tolerancias de fabricación. El troquelado usa marcas superficiales simplificadas y metadata de tipo/posición, sin presentar perforaciones inventadas como cotas técnicas. Objetos afectados: approximationFlags contiene LOCKER_NATIVE_DIMENSION_APPROXIMATED. Ningún valor visual determina códigos o BOM.

## Archivos creados

- src/mepal/lockers/catalog/lockerCatalog.js
- src/mepal/lockers/catalog/lockerDocumentedCatalog.js
- src/mepal/lockers/definitions/lockerUiDefaults.js
- src/mepal/lockers/factories/createLockerInstance.js
- src/mepal/lockers/integration/lockerPersistence.js
- src/mepal/lockers/integration/lockerRegistration.js
- src/mepal/lockers/integration/rebuildLockerInstance.js
- src/mepal/lockers/layout/lockerLayout.js
- src/mepal/lockers/properties/LockersProperties.jsx
- src/mepal/lockers/renderers/LockerNativeRenderer.js
- src/mepal/lockers/renderers/native/lockerMaterials.js
- src/mepal/lockers/renderers/native/lockerNativeConstants.js
- src/mepal/lockers/resolvers/lockersAccessoryResolver.js
- src/mepal/lockers/resolvers/lockersProductCodeResolver.js
- src/mepal/lockers/resolvers/lockersProductResolver.js
- src/mepal/lockers/ui/LockerConfigFields.jsx
- src/mepal/lockers/ui/LockersPanel.jsx
- scripts/importLockerCatalog.cjs
- test/lockers.test.js
- docs/LOCKERS_IMPLEMENTATION.md

## Archivos modificados

- package.json (agrega la suite LOCKERS).
- src/App.jsx; src/components/LeftRail.jsx; LeftPanel.jsx; PropertiesPanel.jsx; ThreeCanvas.jsx.
- src/core/persistence/entitySerializers.js y entityLoaders.js.
- src/history/historyManager.js (nuevo tipo en historial global).
- src/clipboard/clipboardPasteFactory.js y pasteClipboard.js.

No se modificó el cambio preexistente de KoncisaLeaderBuilder.js, ni los documentos del usuario. Sin commit, push ni cambio de rama.

## Pruebas automáticas

38 pruebas LOCKERS: comparación contra Excel, todas las corazas × materiales × cantidades; códigos inactivos/bloqueados; jerarquía, tabiques, crecimiento; independencia de materiales; accesorios y BOM; 12 combinaciones de troquelado; manijas; persistencia mixta; clipboard; undo/redo. 240 configuraciones base válidas se recorren dentro de los casos parametrizados.

Validación final: npm test pasó 173/173, incluidas las 38 pruebas LOCKERS y el bloqueo confirmado de 1 nave embebida Cal.24. npm run build terminó correctamente (744 módulos, 1m 48s). Advertencias del entorno: Node 20.17 frente a requisito Vite 20.19+/22.12+ y chunks mayores de 500 kB. git diff --check pasó; Git informa conversión LF/CRLF.

## Casos visuales manuales preparados (pendientes de ejecución interactiva)

No se afirma validación visual interactiva ni capturas en esta sesión. Ejecutar npm run dev y abrir LOCKERS con una sesión autorizada.

| Caso | Configuración | Comprobar |
|---|---|---|
| Individual | Cal.22, 1800×500×500, metálica, 1 nave | Base Y=0, proporción, coraza y puerta separadas |
| Doble | 1800×800×500 | Un tabique, dos columnas, dos kits en BOM |
| Triple | 1800×1000×500 | Dos tabiques, tres columnas, tres kits |
| Metálica | Troquel TIPO_1, ARRIBA | Ranuras visuales y metadata |
| Formica | Formica, troquel NO_APLICA | Sin troquel; manija de aglomerado |
| Melamina | Melamina, troquel NO_APLICA | Material separado de coraza |
| 2 naves | Individual, bayCount=2 | Dos puertas y un separador incluido |
| 3 naves | Individual, bayCount=3 | Tres puertas y dos separadores |
| 4 naves | Individual, bayCount=4 | Cuatro puertas y tres separadores |
| Entrepaños extra | Activar opción en 2 naves | Dos adicionales, uno incluido; no duplicar BOM |
| Zócalo | Activar, alternar individual/doble/triple | Alto adicional 100 mm; altura comercial intacta |
| Colores por nave | 4 naves: azul/blanco/rojo/verde | Editar una no cambia otras; coraza gris |
| Embebida | Cal.24, 2 naves, seguridad NO_APLICA | Puertas embebidas; herraje incluido |
| Persistencia | Mover, rotar, colores distintos; guardar/cargar | Misma identidad, configuración y ubicación |
| Historial | Crear → editar → mover → undo/redo → borrar → undo | Raíz estable y BOM actualizado |
| Clipboard | Copiar/pegar locker de colores | Nuevo instanceId, mismos acabados, una creación en historial |
| Restricciones | 1 embebida Cal.24, madera+portacandado, anclaje | Diagnóstico y botón bloqueado |

Riesgos/límites: geometría simplificada no apta para fabricación; medidas rematadas y referencias sin código no habilitadas; validación interactiva pendiente; el catálogo técnico entregado es Cal.22, mientras los códigos Cal.24 provienen del Excel.
