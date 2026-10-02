# MULTIPLE: conexiones de producto estándar y de sistema

| Dato o etapa | Producto estándar independiente | Producto dentro de `MULTIPLE_SYSTEM` |
| --- | --- | --- |
| Raíz y padre | `MULTIPLE_PRODUCT` bajo la escena | `MULTIPLE_PRODUCT` bajo `MULTIPLE_SYSTEM` |
| Identidad | `instanceId`; no tiene `moduleId` | `instanceId` y `moduleId` de `MultipleSystem.modules` |
| `componentKey` | En los hijos comerciales del producto | En los mismos hijos comerciales del producto |
| Dimensiones | `userData.config.widthCm`, `heightCm`, `thicknessCm` | Las mismas dimensiones en `modules[].config` y en el producto |
| Puntos | `getMultipleProductConnectionPoints`: `LEFT` y `RIGHT` en coordenadas locales, centrados en `±width/2` | `getMultipleConnectionPoints`: `START` y `END` toman la misma geometría local; agrega puntos de esquina para el sistema |
| Posición local y mundial | `product.position`; `product.getWorldPosition()` y `product.localToWorld()` | `product.position` es local al sistema; los puntos se transforman mediante `MULTIPLE_SYSTEM.matrixWorld` |
| Orientación | `product.getWorldQuaternion()` | `module.rotation.y` más la transformación de la raíz del sistema |
| Tipo | `LINEAR_START` ↔ `LINEAR_END`; conexión lógica `LINEAR` | Tipos lineales, de puerta y esquina según los puntos del sistema |
| Candidato | `previewMultipleStandardSnap`, que adapta las posiciones mundiales al motor espacial `previewMultipleSnap` y limita los puntos a extremos lineales | `previewMultipleProductDrag` → `previewMultipleSnap` |
| Confirmación | `commitMultipleStandardSnap`: coloca el producto y conserva un registro por par en `spatialConnections` | `commitMultipleProductDrag`: actualiza posición y `MULTIPLE_SYSTEM.connections` |
| Guardado | `serializeMultipleEntity` guarda `spatialConnections` como dato espacial, fuera de la configuración y del BOM | `serializeMultipleSystem` guarda las conexiones del sistema |

Las dimensiones comerciales están en centímetros. `toWorldUnitsFromCm` las convierte a metros mediante `toWorldUnitsFromMm(cm × 10)`. Los puntos mundiales se recalculan desde la transformación Three.js actual; no se guardan coordenadas mundiales en la entidad.

Durante `pointermove`, el producto se mueve visualmente y se calcula una vista previa. Dentro de 150 mm se interpola visualmente hacia la posición final; la conexión y la posición definitiva se guardan solo al soltar. El límite de captura sigue siendo 300 mm.

## Verificación manual pendiente

El entorno de pruebas no ofrece control de mouse sobre la ventana Electron. En la aplicación: crear dos productos estándar separados 20–30 cm, arrastrar el segundo, comprobar marcadores y conexión al soltar; repetir con anchos distintos, dos módulos de sistema y un producto previamente conectado. Para inspeccionar candidatos, activar `localStorage.setItem('MULTIPLE_SMART_LAYOUT_DEBUG', 'true')` en la consola y recargar. El modo se apaga con `localStorage.removeItem('MULTIPLE_SMART_LAYOUT_DEBUG')`.

El ancho 180 cm se cubre en la prueba de geometría de puntos. El catálogo comercial actual no permite instanciar un producto estándar de 180 cm, por lo que no se afirma una prueba visual de esa variante.
