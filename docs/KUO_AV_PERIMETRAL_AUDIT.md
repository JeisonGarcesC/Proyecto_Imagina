# Auditoría Técnica de Implementación: KUO AV - Superficie Perimetral (Pasos 1 a 5)

---

## 1. Estado actual

Se ha completado la capa central lógica y de instanciación de **KUO AV - Superficie Perimetral** sin alterar el código fuente existente de la aplicación ni romper la compilación (`vite build` pasando con 0 errores).

### Archivos Implementados:
1. `src/mepal/kuoAV/config/kuoAVTunables.js` (Paso 1: Constantes, límites provisionales y rutas).
2. `src/mepal/kuoAV/parts/kuoAVParts.js` (Paso 2: Constructores abstractos de piezas bajo el patrón Koncisa Plus).
3. `src/mepal/kuoAV/rules/kuoAVSurfaceRules.js` (Paso 3: Dimensiones de cobro, lógica de superficie y prefijos especiales).
4. `src/mepal/kuoAV/rules/kuoAVBaseRules.js` (Paso 3: Elevación en $Y$, posicionamiento de columnas y travesaño).
5. `src/mepal/kuoAV/rules/kuoAVAccessoryRules.js` (Paso 3: Kit Fuente, Vértebra y Grommet).
6. `src/mepal/kuoAV/builder/KuoAVBuilder.js` (Paso 4: Builder determinístico de partes).
7. `src/mepal/kuoAV/factory/createKuoAVInstance.js` (Paso 5: Factory 3D, empaquetado de `userData` y proxies resilientes).

---

## 2. Arquitectura implementada

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Entrada: Objeto Config                             │
│ { anchoMm, profundidadMm, alturaMm, thickMm, kitFuente, vertebra... }   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 KuoAVBuilder.js (Motor Determinista)                    │
│ ├── kuoAVSurfaceRules.js  -> Resuelve billingDim, isSpecial, logicalCode│
│ ├── kuoAVBaseRules.js     -> Resuelve offsets Y, columnas y travesaño   │
│ └── kuoAVAccessoryRules.js-> Resuelve offsets de accesorios CET         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼ Lista estructurada de Parts[]
┌─────────────────────────────────────────────────────────────────────────┐
│                 createKuoAVInstance.js (Factory 3D)                     │
│ ├── Superficie  -> BoxGeometry procedural (createSurfaceMesh)           │
│ ├── Columnas    -> Carga asíncrona de GLB / Proxy visual resiliente     │
│ ├── Travesaño   -> BoxGeometry extensible en X                          │
│ ├── Accesorios  -> GLBs posicionados en Y/X según altura y opciones     │
│ └── userData    -> kind: 'KUO_AV_ASSEMBLY', config, kuoAVParts (BOM)    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Clasificación de Datos y Comportamientos

| Elemento / Parámetro | Estado | Clasificación | Justificación / Origen |
| :--- | :--- | :---: | :--- |
| **Generación de Superficie Paramétrica** | Implementado | **A** | Utiliza directamente `createSurfaceMesh` de `src/factories/surfaceFactory.js` (BoxGeometry continuo sin GLBs rígidos). |
| **Persistencia de Receta (`userData.config`)** | Implementado | **A** | Estándar universal de IMAGINA para preservar el estado completo en el nodo raíz de Three.js. |
| **Soporte de Copiar / Pegar / Rotar / Undo** | Implementado | **A** | `createKuoAVInstance` soporta `transformOverrides`, `instanceId` y genera un árbol plano serializable. |
| **Desglose en BOM (`userData.kuoAVParts`)** | Implementado | **A** | Estructura de array idéntica a `typologyParts` y `koncisaPlus` para cotización en `ThreeCanvas.emitBOM()`. |
| **Opciones Visibles de CET** | Implementado | **B** | Espesor, Kit Fuente, Acabado Grommet, Especial/Rematable, Aumentar Altura, Elevar kit F izq, Vértebra Lateral. |
| **Rango de Altura (730 a 1200 mm)** | Implementado | **C** | Inferido de los estándares ergonómicos de mesas ajustables motorizadas y límites de Koncisa/CET. |
| **Sangría de Columnas (`insetXMm: 60`)** | Implementado | **C** | Inferido para permitir que la tapa perimetral vuele lateralmente respecto a los cabezales de las columnas. |
| **Cálculo de Travesaño (`ancho - 2*inset`)** | Implementado | **C** | Inferido del patrón de travesaños extensibles de `KoncisaCostadoRules.js`. |
| **Posicionamiento de Kit Fuente** | Implementado | **C** | Inferido: bajo la tapa en $Z=-250$ o elevado en cuadrante izquierdo si `elevarKitFIzquierdo === true`. |
| **Posicionamiento de Vértebra** | Implementado | **C** | Inferido: fijada en $Y=0$ (piso) con extensión vertical hasta la base inferior de la superficie. |
| **Dimensiones Base Fallback (`1200x600`)** | Provisional | **D** | Valores provisionales de arranque en `kuoAVTunables.js`. |
| **Nombres de Archivos GLB de Accesorios** | Provisional | **D** | Rutas `/assets/models/Kuo AV/<NOMBRE>.glb` pendientes de los archivos reales exportados desde CET. |
| **Part Numbers / Precios / SAP** | Pendiente | **D** | Se mantienen `code: null` y `prices: { CO: 0, EUC: 0, USD: 0 }` para no inventar datos falsos. |

---

## 4. Datos Confirmados (Categorías A y B)

1. **Patrón de Ensamblaje Híbrido:**
   - La separación entre tablero procedural paramétrico y herrajes/columnas GLB es 100% fiel al modelo de Koncisa Plus.
2. **Determinismo:**
   - Para idénticos parámetros de entrada, `KuoAVBuilder.buildKuoAV()` produce exactamente las mismas piezas, dimensiones y coordenadas $(X, Y, Z)$ sin números aleatorios ni marcas de tiempo.
3. **Resiliencia de Renderizado:**
   - Si los archivos `.glb` de las columnas o vértebras no existen aún en disco, la Factory genera proxies volumétricos temporales permitiendo probar la mesa en el canvas sin lanzar excepciones de runtime.
4. **Conjunto de Opciones CET:**
   - Todas las opciones solicitadas por el usuario están mapeadas en el objeto `config` y en las reglas de accesorios.

---

## 5. Datos Inferidos (Categoría C)

1. **Cálculo de Elevación en Eje $Y$:**
   - Se asumió que la cara superior de la superficie perimetral se posiciona en $Y = \text{alturaMm} / 1000$ y que el travesaño baja con el espesor de la tapa.
2. **Lado de la Vértebra:**
   - Se infirió que la vértebra se coloca por defecto en el lado izquierdo (`izq`) salvo que se especifique `der`.
3. **Ubicación del Grommet:**
   - Se asumió centrado en $X=0$ y a $60\text{ mm}$ del borde posterior ($Z = -\text{fondo}/2 + 60$).

---

## 6. Datos Provisionales (Categoría D)

1. **Matriz de Dimensiones Estándar:**
   - Se definieron provisionalmente anchos $[1200, 1400, 1600, 1800]\text{ mm}$ y fondos $[600, 700, 800]\text{ mm}$.
2. **Espesores Disponibles:**
   - Se contemplaron $18\text{ mm}$, $25\text{ mm}$ y $30\text{ mm}$.
3. **Rutas de Modelos GLB:**
   - Se parametrizaron `COLUMNA_MOTORIZADA.glb`, `KIT_FUENTE.glb`, `VERTEBRA_LATERAL.glb` y `GROMMET.glb`.

---

## 7. Datos que debemos obtener de CET

1. **Matriz de Part Numbers / Lookup Tags Oficial:**
   - Tabla que relacione: `[Medida Ancho x Fondo] + [Espesor] + [Acabado] -> Part Number SAP / CET`.
2. **Lógica de Códigos de Accesorios:**
   - Part Numbers individuales para el Kit Fuente, la Vértebra Lateral y los Grommets.
3. **Archivos 3D GLB Oficiales:**
   - Exportación limpia desde CET de la columna telescópica motorizada y los kits de electrificación.

---

## 8. Datos que debemos preguntar a Ingeniería

1. **Rango Real de Alturas:**
   - ¿Cuál es la cota mínima exacta ($710\text{ mm}$ o $730\text{ mm}$) y la cota máxima ($1180\text{ mm}$, $1200\text{ mm}$ o $1210\text{ mm}$)?
2. **Criterio de Incremento de Medidas:**
   - ¿Las medidas intermedias (ej. $1350\text{ mm}$) son permitidas como "Especial" o el producto solo se vende en medidas modulares fijas cada $100\text{ mm}$?
3. **Mecanizado del Kit Fuente Elevado:**
   - ¿El Kit Fuente elevado requiere un mecanizado perimetral en la tapa o se monta con prensa sobre el borde posterior?
4. **Cantidad de Grommets según Ancho:**
   - ¿A partir de qué ancho de mesa ($1600\text{ mm}$ o $1800\text{ mm}$) se colocan 2 pasacables en lugar de 1?

---

## 9. Riesgos Técnicos Detectados

1. **Colisión de Transformaciones en la Vértebra:**
   - Si la vértebra es un GLB estático, al variar la altura entre 730 y 1200 mm se debe escalar en $Y$ (`scale.y`) o segmentar para que no se deforme la geometría de los eslabones.
2. **Nombres de Materiales en GLB:**
   - Para que el usuario pueda cambiar el color de la estructura metálica (blanco, negro, gris) mediante `applyMaterialToObject3D`, las mallas internas del GLB de la columna deben tener nombres predecibles.
3. **Sincronización de Catálogo en Memoria:**
   - Si los Part Numbers de KUO AV no existen en los XML de precios (`PriceList_CO.xml`), el BOM mostrará precio 0 hasta que se carguen en SAP/catálogo.

---

## 10. Qué falta para conectar Calculator / BOM / Precios

1. **En `ThreeCanvas.jsx`:**
   - Añadir el bloque evaluador en `emitBOM()`:
     ```javascript
     if (obj.userData?.kind === 'KUO_AV_ASSEMBLY') {
       // Itera obj.userData.kuoAVParts y llama a addRow(...)
     }
     ```
2. **En las Listas de Precios XML:**
   - Registrar los Part Numbers oficiales de KUO AV en `PriceList_CO.xml`, `PriceList_EUC.xml` y `PriceList_USD.xml`.

---

## 11. Recomendación del Siguiente Paso

Una vez validado este informe, el siguiente paso técnico es el **PASO 6**:
- Integrar la invocación de `createKuoAVInstance` dentro de `ThreeCanvas.jsx` (`addKuoAV` y `swapKuoAVVariant`) y conectar el evaluador en `emitBOM()`, permitiendo insertar y cotizar la mesa KUO AV en el canvas 3D.
