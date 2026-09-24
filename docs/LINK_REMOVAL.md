# Retiro de la implementación anterior de LINK

La auditoría precedió a la eliminación. Se revisaron referencias globales, consumidores, creación, propiedades, BOM, persistencia, registros, reglas, tests, assets y el historial Git. No se implementó una nueva línea LINK.

El commit `6f66767` (Implementacion Kuo altura Variable) incorporó tanto LINK como módulos independientes de Kuo. Se consultaron `git log`, `git show` y `git blame`: compartir commit no implicaba compartir implementación. Las reglas LINK.SYS de superficies ya existían desde `ef60f48`. No se revirtió ningún commit.

El árbol estaba limpio al comenzar. Durante la auditoría aparecieron cambios ajenos en `ThreeCanvas.jsx`; se conservaron. Una comparación contra la copia inmediatamente anterior a la eliminación confirmó que solo se retiraron el import, las dos funciones y sus exposiciones de API de LINK. El diff total contra HEAD incluye esos cambios ajenos.

## 1. Archivos eliminados

- `src/mepal/link/builders/LinkBuilder.js`
- `src/mepal/link/catalog/linkCatalog.js`
- `src/mepal/link/config/linkTunables.js`
- `src/mepal/link/factories/createLinkInstance.js`
- `src/mepal/link/parts/linkParts.js`
- `src/components/LinkPanel.jsx`
- `src/components/properties/LinkProperties.jsx`

Git registra la ruta como `link` en minúsculas. Los siete archivos eran exclusivos de esta implementación.

## 2. Archivos modificados

- `src/App.jsx`: retira LINK.SYS de las opciones y del valor inicial del modal de superficies.
- `src/catalog/catalogData.js`: retira el artículo exclusivo LINK `22000032439`.
- `src/catalog/modelRegistry.js`: retira el registro de ese artículo; conserva los recursos físicos.
- `src/components/CatalogPanel.jsx`: elimina ese código del texto de ejemplo de búsqueda.
- `src/components/LeftPanel.jsx`: retira import, panel, carpeta de imágenes registrada para LINK y el código de ejemplo.
- `src/components/LeftRail.jsx`: retira el botón LINK.
- `src/components/SurfaceModal.jsx`: limita sus opciones iniciales a KONCISA.PLUS.
- `src/components/ThreeCanvas.jsx`: retira `createLinkInstance`, `addLink`, `swapLinkVariant` y las dos entradas de API.
- `src/components/properties/PropertiesPopup.jsx`: retira import, predicado y vista LINK.
- `src/rules/surfaceRules.js`: retira únicamente la tabla LINK.SYS.

Archivo añadido: `docs/LINK_REMOVAL.md` (este reporte).

## 3. Archivos conservados

Se conservaron íntegros los módulos de Kuo, Kuo AV Doble, Kuo Go, Vetro, Lockers, Koncisa y Criterium y sus tests, modelos y reglas. Sus entradas de interfaz siguen presentes. La compilación verifica la resolución de sus imports; no se realizó una sesión visual interactiva.

Se conservaron `PropertiesPanel.jsx`, `src/core/persistence/`, `src/factories/surfaceRuleResolver.js`, las utilidades de exportación y el BOM general. También permanecen `KUO_AV_REFERENCIAS_ARQUITECTURA.md` y `KUO_GO_ESTADO_ACTUAL.md`: sus menciones a LINK describen historia o comparaciones arquitectónicas.

## 4. Assets conservados

- `public/assets/models/Link/Credenza EXE/`: los 16 GLB, combinaciones de LKAL160000, LKAL170000, LKAL180000 y LKAL190000, entregas IZ/DER y anchos 120/150.
- `public/assets/imagen/Link/Credenza EXE/Credenza EXE.jpg`.
- `public/assets/iconos_imagen/link.png`.
- `public/assets/models/2KSO330000_60.glb`.
- `public/assets/meta/2KSO330000_60.connectors.json`.
- Todos los demás directorios de modelos, texturas, imágenes y datos comerciales en `public/`.

Se verificó la existencia de los 18 assets con ruta LINK y la ausencia de cambios Git en `public/`. No se eliminaron carpetas de modelos.

## 5. Dependencias compartidas

Se conservaron React, Three.js, GLTFLoader y las dependencias de carga y visualización. `uuid`, utilizado por LinkBuilder, también tiene consumidor en KuoGoBuilder. No se modificaron `package.json`, scripts ni archivos de bloqueo: no se identificaron dependencias o scripts exclusivos de LINK.

## 6. Lógica de Kuo

LINK cargaba credenzas completas desde GLB, con tipo, entrega y ancho. No contenía un motor de altura variable. Kuo mantiene sus constructores, factories, paneles, propiedades, transformaciones y reglas independientes. No se refactorizó Kuo ni se cambió su cálculo de altura.

## 7. Referencias de LINK eliminadas

Se retiraron el acceso lateral, panel de creación, propiedades y predicado de editabilidad; las funciones `buildLink`, `getLinkTipoDef`, `buildGLBFilename`, `buildGLBPath` y `createLinkInstance`; sus constantes, catálogo vacío y tunables; y `addLink`/`swapLinkVariant` de ThreeCanvas.

Con la factory y los métodos se retiraron sus altas específicas en escena, parts y pickables, su selección inicial y emisión de BOM, junto con los metadatos `kind: LINK` y `linkParts`. La infraestructura compartida permanece intacta.

Se retiraron la opción de superficie LINK.SYS, su tabla comercial y el registro exclusivo del costado `22000032439`. El catálogo comercial común y los códigos usados por Kuo se conservaron. Los estilos exclusivos desaparecieron con los dos componentes; se mantuvieron los estilos compartidos.

No había un serializer, loader, tipo persistente, renderer separado, listener ni test exclusivo de LINK registrado que debiera eliminarse. `PropertiesPanel.jsx` no contenía integración LINK; estaba en `PropertiesPopup.jsx`.

### Proyectos antiguos

No se modificaron archivos de proyectos ni se introdujo migración. El serializador general convierte los tipos no reconocidos en `PART`; LINK no tenía un tipo persistente admitido. Una entidad guardada explícitamente con `kind: LINK` sigue provocando `UNSUPPORTED_KIND:LINK` en el loader general.

Una credenza histórica serializada como `PART` pasa por la resolución genérica de catálogo/tipologías: solo podrá reconstruirse si esa infraestructura encuentra una definición válida. No existe ya la factory de LINK como respaldo; si el creador no devuelve un objeto, se registra el fallo de carga y se continúa con las otras entidades. Por tanto, no se garantiza reconstruir credenzas antiguas.

Las superficies históricas genéricas `SURFACE` con etiqueta LINK.SYS conservan su restauración por dimensiones, a través del mecanismo común. Se preservó este comportamiento para no alterar el loader general ni introducir una migración destructiva. La etiqueta no habilita la antigua línea LINK.

## 8. Funciones compartidas conservadas

`loadExistingGlb`, `CardImage`, `IMAGE_FOLDER_SETS` (salvo la entrada LINK), `sectionStyle`, `removePartObject`, `emitBOM`, `frameObject`, `refreshFloorAndGrid`, la selección y resolución de assemblies, los resolvers genéricos de superficies y los loaders/serializers siguen disponibles para sus otros consumidores. `linkedMembers` es una relación genérica de selección, no una referencia a la línea.

## 9. Código de altura variable

En `src/mepal/kuoAV/rules/kuoAVBaseRules.js` se conservaron:

- `clampKuoAVHeight`: límites 730–1200 mm y valor inicial 730 mm.
- `resolveKuoAVElevationOffsets`: superficie a `h - espesor/2`, travesaño a `h - espesor - 20`, base a 0 y elevación a `h - 730`.
- `resolveKuoAVBaseRules`: posiciones de columnas y longitud del travesaño telescópico.

Se conservaron sus tunables y consumidores en reglas de accesorios, builder y parts de Kuo AV. Kuo AV Doble mantiene su resolución independiente de altura, selección de paral y escala vertical. No se encontraron `LinkEXELegPart`, `LinkWholeLegPart` ni `linkLegProxies` en el código auditado.

Una comprobación ejecutable validó alturas por debajo del mínimo, ambos extremos, un valor intermedio y por encima del máximo, offsets con espesores 25/30 mm y posiciones/longitud del travesaño. Todas las comprobaciones aprobaron. Git confirmó que no se modificaron los módulos de estas líneas.

## 10. Assets

**NO se eliminaron modelos 3D ni assets.**

## 11. Tests

`npm test`: **173 aprobados, 0 fallos**.

Comprobación adicional antes y después: `node --test test/kuoAVBOM.test.js test/kuoAVDobleBOM.test.js test/kuoAVVertebra.test.js`: **19 aprobados y 1 fallo preexistente**. `test/kuoAVBOM.test.js` importa `src/mepal/kuoAV/config/kuoAVBOMCatalog.js`, que ya no existía antes de la limpieza (`ERR_MODULE_NOT_FOUND`). No se corrigió ni eliminó ese test ajeno a LINK.

No se eliminaron tests compartidos, incluido el que verifica una descripción comercial LINK usada por Kuo AV Doble.

## 12. Build

`npm run build`: **aprobado**, 738 módulos transformados, salida de producción generada.

Advertencias: el entorno usa Node 20.17.0, mientras Vite solicita 20.19+ o 22.12+; también hay bundles de más de 500 kB. La advertencia de versión es una condición del entorno, no una dependencia cambiada por esta limpieza.

## 13. Diff check

`git diff --check`: **aprobado**, sin errores de whitespace. Git avisa sobre su normalización habitual LF/CRLF.

Se revisaron estado y resumen de diff. No se hicieron commits, push, cambios de rama, reset, checkout ni clean.

## 14. Problemas pendientes y referencias conservadas

`npm run lint` sigue fallando por diagnósticos existentes. Comparación JSON por archivo, regla, mensaje y severidad, ignorando desplazamientos de línea: **antes 142 errores/10 advertencias; después 134 errores/9 advertencias; ningún diagnóstico nuevo**. Se excluyeron del conteo scripts temporales de verificación, eliminados al terminar.

La búsqueda posterior en `src`, `test` y `scripts` conserva deliberadamente:

- Descripciones comerciales LINK de grommets LKAC250000 y superficies LKSU en `kuoAVDobleBOMCatalog.js`, su test y `koncisaIntegrationRules.js`: piezas usadas por otras líneas.
- Variables DOM `link` en exportaciones y BOM, `xlink` de SVG y `linkedMembers` de selección: infraestructura general.
- Nombres/rutas de assets, datos comerciales y documentación histórica: recursos conservados para otras líneas o para una futura implementación.

No quedan imports ni llamadas a los siete archivos retirados. No se implementó la nueva versión de LINK. Quedan pendientes el lint previo, el import roto del test de Kuo y la validación visual interactiva; los proyectos antiguos tienen las limitaciones descritas arriba.
