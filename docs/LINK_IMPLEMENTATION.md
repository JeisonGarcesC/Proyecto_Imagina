# LINK: arquitectura alineada con Koncisa Plus

LINK está organizada por piezas y reglas comerciales. Koncisa Plus sirve como referencia de estructura y como fuente temporal de modelos GLB; los códigos, medidas, configuración, metadata y BOM pertenecen a LINK.

## Estructura

- `builders/LinkStandardBuilder.js`: puestos sencillos, dobles y bancos.
- `leader/LinkLeaderBuilder.js`: puesto líder aislado del builder estándar.
- `leader/rules`, `leader/parts` y `leader/ui`: reglas, piezas y formulario exclusivos del líder.
- `parts`: superficies, costados, vigas, ductos y grommets.
- `rules`: reglas separadas para superficies, costados, vigas, grommets, ductos horizontales, bajantes a piso, bajantes a techo y tapas.
- `src/components/LinkPanel.jsx`: entrada de interfaz, en paralelo con `KoncisaPlusPanel.jsx`.
- `src/components/properties/linkCarpetaProperties`: propiedades contextuales por tipo de pieza.
- `factories`, `integration`, `renderers` y `bom`: creación, selección, persistencia, visuales y cantidades.

No se modificaron módulos ni modelos de Koncisa Plus.

## Modelos temporales

Los costados, ductos, bajantes, tapas, grommets, pedestal, credenza y accesorios declaran `model: { kind: 'glb', src }` y cargan temporalmente GLB existentes de Koncisa Plus. Cada instancia conserva metadata LINK y clona geometría/materiales para no alterar el recurso compartido. No se fabrica una copia nativa previa; si un archivo falla, el grupo conserva sus metadatos y BOM y registra el error visual.

Las superficies y vigas se generan con geometría paramétrica, como piezas dimensionables. Los modelos temporales se declaran junto a la regla de cada pieza para poder sustituirlos de forma localizada.

## Propiedades por pieza

El popup ya no presenta el formulario para crear nuevamente el puesto. Al pulsar una pieza muestra solo sus opciones:

- Superficie o grommet: familia/espesor, grommet, acabado y posición; en líder también bajante a piso.
- Costado: forma, acabado, caja de tomas de unión o sustitución por pedestal cuando corresponda.
- Ducto intermedio: tapas izquierda/derecha, bajante a piso, posición, bajante a techo y lado.
- Bajante o tapa: acabado aplicable y acción para quitar el accesorio.

Cada cambio actualiza `config.components[componentKey]`, reconstruye la raíz existente, conserva transformaciones y se registra como una única acción en el historial global. Los acabados generales siguen usando Parte/Grupo/Todo.

## Ductos LINK

El ducto horizontal ofrecido es intermedio. Se genera uno por módulo y usa códigos LINK:

- Sencillo 120/150/180 cm: `22000021979`, `22000021980`, `22000021981`.
- Doble 120/150/180 cm: `22000021976`, `22000021977`, `22000021978`.

Bajantes según mapa, páginas 14–15:

- Piso sencillo pintado/cromado: `22000011860` / `22000114672`.
- Piso doble pintado/cromado: `22000009982` / `22000119705`.
- Techo sencillo: `22000111148`.
- Techo doble: `22000009983`.

Las tapas usan bloques temporales de Koncisa. El mapa suministrado no contiene un SKU independiente para ellas, por lo que permanecen sin código y marcan la BOM como parcial.

## Puesto líder

El líder tiene composición independiente con superficie principal, retorno, costados libre/de unión/de retorno, viga, láminas de unión, grommets, cajas de tomas, bajantes y pedestal opcional. El extremo del retorno inicia con costado y puede reemplazarse por pedestal desde sus propiedades.

El formulario líder permite usar una credenza LINK en lugar del retorno. La variante implementada corresponde a credenza para cableado de dos gavetas archivo, 120/150 cm, con códigos `22000044143`–`22000044146`. La superficie para cableado usa `22000044163`–`22000044168` y la viga `22000044169`–`22000044171`.

El pedestal usa temporalmente el GLB de Koncisa y queda sin SKU hasta confirmar la referencia comercial LINK.

## Validación

- 62 pruebas específicas LINK aprobadas.
- Compilación de producción aprobada, con las advertencias existentes sobre Node 20.17 y tamaño de bundles.
- Lint específico y `git diff --check` aprobados.
- Suite completa: 234 de 236 pruebas aprobadas. Los dos fallos aislados pertenecen a Lockers (catálogo de acabados y color por nave), también fallan al ejecutar `test/lockers.test.js` solo y no fueron modificados en este trabajo.

No se realizaron commit, push ni cambios de rama. `LINK_REMOVAL.md` conserva únicamente el registro histórico de la implementación anterior.
