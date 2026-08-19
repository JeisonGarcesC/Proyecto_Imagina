# Referencias de Arquitectura para KUO AV - Superficie Perimetral

---

## 1. Qué producto existente tiene la lógica más parecida a KUO AV

### Comparativa: Koncisa Plus vs Link

| Criterio | Link | Koncisa Plus | Requerimiento KUO AV | Producto Ganador |
| :--- | :--- | :--- | :--- | :--- |
| **Dimensionamiento** | Discreto y rígido (solo 120 y 150 cm). | **Paramétrico milimétrico continuo** ($1000 \dots 2400\text{ mm}$). | Dimensiones perimetrales variables continuas sin crear un GLB por medida. | **Koncisa Plus** |
| **Construcción 3D** | 1 solo archivo GLB cerrado por variante. | **Híbrido:** Superficie procedural + Cantos PVC + Sub-piezas GLB. | Tapa procedural continua + Columnas elevables GLB + Accesorios GLB. | **Koncisa Plus** |
| **Movimiento / Transformación Interna** | Ninguno (geometría estática). | **Offsets posicionales dinámicos** ($X, Y, Z$) por componente. | Elevación en eje $Y$ (ajuste de altura motorizada 730–1200mm). | **Koncisa Plus** |
| **Accesorios Opcionales** | Fijos en el modelo. | **Sub-partes conmutables** (Grommets, Ductos, Pedestales). | Kit Fuente, Vértebra Lateral, Grommet conmutables. | **Koncisa Plus** |
| **Desglose en BOM** | 1 ítem con metadata. | **Desglose multipieza estructurado** por rol y categoría. | Desglose CET (Tapa + Columnas + Electrificación + Vértebra). | **Koncisa Plus** |

> [!IMPORTANT]
> **Koncisa Plus es el producto con la lógica más parecida y adecuada para KUO AV.** 
> Link utiliza un enfoque monobloque que requeriría modelar y exportar cientos de archivos GLB para cada variación dimensional. Koncisa Plus ya resuelve la generación procedural de tapas continuas, la unión con herrajes GLB fijos y el cálculo de precios.

---

## 2. Cómo se generan sus superficies paramétricas

En **Koncisa Plus**, las superficies se generan proceduralmente combinando 3 módulos:

1. **Geometría Base (`src/factories/surfaceFactory.js` Líneas 21-46):**
   - Función `createSurfaceMesh({ widthM, depthM, thicknessM, color })`.
   - Crea un `THREE.BoxGeometry(widthM, thicknessM, depthM)` donde:
     - `widthM` = Ancho en metros (X).
     - `thicknessM` = Espesor en metros (Y: 18mm, 25mm, 30mm).
     - `depthM` = Profundidad en metros (Z).
2. **Cantos Perimetrales Independientes (`src/components/ThreeCanvas.jsx` Líneas 8238-8312):**
   - Función `addSurfaceEdgesToGroup(...)`.
   - Genera 4 mallas independientes para los bordes (`CANTO_FRONTAL`, `CANTO_POSTERIOR`, `CANTO_IZQUIERDO`, `CANTO_DERECHO`) con espesor de canto configurable (1mm, 2mm, 3mm) y `edgeGroupKey: 'SURFACE_EDGE_ALL'`.
3. **Registro en Three.js (`src/components/ThreeCanvas.jsx` Líneas 8314-8500):**
   - Función `addSurface(...)` que empaqueta `userData`:
     - `dim`: Medidas reales milimétricas para 3D.
     - `billingDimMm`: Medida comercial redondeada para catálogo de precios.
     - `codigoPT`: Part Number comercial.

---

## 3. Cómo se generan componentes que cambian de tamaño

Para componentes estructurales que deben adaptarse al ancho o profundidad sin distorsionar los cabezales metálicos:

1. **Patrón de Travesaños Extensibles (`src/mepal/koncisaPlus/rules/koncisaCostadoRules.js` Líneas 38-52):**
   - Los extremos izquierdo y derecho son sub-mallas GLB fijas (`leftLegSrc`, `rightLegSrc`).
   - El travesaño que las une es una caja procedural `THREE.BoxGeometry` cuya dimensión se calcula matemáticamente:
     $$\text{Largo Travesaño} = \text{Ancho Total} - (\text{Ancho Cabezal Izq} + \text{Ancho Cabezal Der})$$
   - El travesaño se posiciona exactamente en el centro y se actualiza su matriz mundial.
2. **Aplicación para KUO AV:**
   - La viga telescópica bajo la tapa de KUO AV se estira en $X$ según el ancho de la mesa, mientras que las columnas motorizadas en los extremos conservan su escala exacta $(1, 1, 1)$.

---

## 4. Cómo se separan las piezas 3D

Koncisa Plus no trata el mueble como un bloque único, sino como un **Grafo Jerárquico de Nodos Three.js**:

```
THREE.Group (userData: isPartRoot: true, kind: 'KUO_AV_ASSEMBLY')
├── Mesh: Superficie Tapa (BoxGeometry Procedural + Cantos PVC)
├── Group: Columna Telescópica Izquierda (GLB cargado)
│     ├── Mesh: Base / Patín inferior (Fijo en Y=0)
│     └── Mesh: Columna / Cabezal superior (Offset Y según altura)
├── Group: Columna Telescópica Derecha (GLB cargado)
├── Mesh: Viga Telescópica Central (BoxGeometry extensible)
├── Object3D: Kit Fuente / Electrificación (GLB conmutable)
├── Object3D: Vértebra Lateral (GLB conmutable)
└── Object3D: Grommets Pasacables (GLB montados en tapa)
```

---

## 5. Qué Builders y Factories utiliza

| Módulo | Archivo | Función | Rol Técnico |
| :--- | :--- | :--- | :--- |
| **Builder Koncisa** | `src/mepal/koncisaPlus/builders/KoncisaPlusBuilder.js` | `buildKoncisaPlus(config)` | Motor matemático puro. Recibe opciones y devuelve la lista abstracta de partes con dimensiones y coordenadas espaciales $(X, Y, Z)$. |
| **Factory Koncisa** | `src/mepal/koncisaPlus/factories/createKoncisaPlusInstance.js` | `createKoncisaPlusInstance({ api, config })` | Orquestador 3D. Crea el `THREE.Group`, invoca `api.addSurface`, carga los GLBs y configura la jerarquía en la escena. |
| **Surface Factory** | `src/factories/surfaceFactory.js` | `createSurfaceMesh`, `createSurfaceMeta` | Factoría paramétrica de tableros y conectores de snap. |

---

## 6. Qué Rules utiliza para dimensiones, variantes, códigos y precios

1. **`src/mepal/koncisaPlus/rules/koncisaSurfaceRules.js` (`KONCISA_SURFACE_RULES`):**
   - Mapea llaves compuestas `[TIPO][LARGO][FONDO][ESPESOR]-[ACABADO]` a códigos comerciales reales de SAP/PT.
2. **`src/rules/surfaceRules.js` (`resolveSurfaceCodigoPT`):**
   - Normaliza medidas reales a medidas de cobro de catálogo (ej: $1385\text{ mm} \to 1400\text{ mm}$) y resuelve el Part Number.
3. **`src/mepal/koncisaPlus/rules/koncisaRules.js` (`getSuperficiesConfig`, `getCostadosConfig`):**
   - Reglas geométricas de espaciado y colocación de elementos según número de módulos.

---

## 7. Cómo guarda la configuración/receta

La configuración no se pierde porque se almacena en el nodo raíz de Three.js:

- **En `group.userData.config`:** Objeto con todas las opciones seleccionadas (ancho, fondo, espesor, altura, kitFuente, vertebra, etc.).
- **En `group.userData.kuoAVParts`:** Array de sub-componentes para el desglose del BOM.
- **En `group.userData.instanceId`:** UUID único e inmutable que identifica ese producto en el canvas.
- **Serialización (`src/mepal/koncisaPlus/serialization/serializeKoncisaPlusRecipe.js`):**
  - Función `toSerializable(value)` que depura referencias cíclicas y objetos Three.js para exportar/guardar en JSON limpio.

---

## 8. Cómo funcionan copiar, pegar, rotar y Undo/Redo

| Operación | Archivo / Función | Cómo opera |
| :--- | :--- | :--- |
| **Copiar / Pegar** | `src/clipboard/clipboardManager.js` → `setClipboard()` / `getClipboard()` | Copia la receta JSON limpia de `group.userData.config`. Al pegar, ejecuta `createKuoAVInstance` con un nuevo ID y un offset espacial $(X+0.3, Z+0.3)$. |
| **Rotar** | `src/components/ThreeCanvas.jsx` → `rotateObject3D()` | Rota el `THREE.Group` contenedor sobre el eje $Y$ en pasos de $90^\circ$ manteniendo todas las subpiezas en sus posiciones relativas. |
| **Mover (Drag)** | `src/components/ThreeCanvas.jsx` (Líneas 5500-5800) | Traslada el grupo completo en el plano $XZ$ asistido por `geometrySnap2D.js`. |
| **Undo / Redo** | `src/history/CreateObjectsCommand.js` | Guarda el estado anterior y posterior de los objetos para restaurarlos sin reiniciar el canvas. |

---

## 9. Cómo se genera el BOM

En `src/components/ThreeCanvas.jsx` (`emitBOM`, Líneas 1355-1820):

1. `emitBOM()` evalúa los objetos activos en la escena.
2. Si el objeto contiene `userData.kuoAVParts`, recorre cada sub-pieza y ejecuta:
   ```javascript
   addRow(
     it.code,           // Part Number CET / SAP
     it.qty,            // Cantidad
     it.description,    // Descripción del ítem
     it.unitPrice,      // Precio unitario
     groupId,           // ID del grupo
     groupName,         // Nombre de la agrupación
     it.prices,         // { CO, EUC, USD }
     null,
     groupInstanceId    // ID de la instancia
   );
   ```
3. `addRow()` consolida las cantidades, calcula `total = unitPrice * qty` para la divisa activa (`CO`, `EUC`, `USD`) y actualiza el estado global `bomData`.

---

## 10. Cómo se manejan los GLB que sí son piezas fijas

1. **Ubicación:** Se alojan en `public/assets/models/Kuo AV/`.
2. **Carga Segura:** Se cargan mediante `loadExistingGlb` (`ThreeCanvas.jsx` Línea 2222) evitando falsos 200 de Vite.
3. **Incrustación en el Ensamble:** Las mallas GLB se añaden como hijos del `THREE.Group` del producto y se ajustan sus coordenadas relativas $(X, Y, Z)$ según la altura o ancho activo.

---

## 11. Funciones existentes que podemos reutilizar directamente para KUO AV

| Archivo | Función | Producto Origen | Qué hace | Por qué sirve para KUO AV | Estado de Reutilización |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/factories/surfaceFactory.js` | `createSurfaceMesh` | Koncisa Plus / General | Genera mallas de tablero procedurales con dimensiones paramétricas continuas. | Crea la tapa de KUO AV en cualquier medida sin archivos GLB estáticos. | **Directo (100%)** |
| `src/factories/surfaceFactory.js` | `createSurfaceMeta` | Koncisa Plus / General | Genera metadatos y líneas de snap perimetral. | Permite alinear mesas KUO AV magnéticamente en layouts 2D y 3D. | **Directo (100%)** |
| `src/components/ThreeCanvas.jsx` | `addSurfaceEdgesToGroup` | Koncisa Plus | Genera 4 cantos de PVC independientes. | Brinda cantos realistas con grosor configurable (1mm, 2mm, 3mm). | **Directo (100%)** |
| `src/components/ThreeCanvas.jsx` | `loadExistingGlb` | Koncisa / Link / General | Carga y parsea archivos GLB de forma segura con verificación MIME. | Carga de columnas telescópicas, vértebra y kit fuente GLB. | **Directo (100%)** |
| `src/materials/applyMaterial.js` | `applyMaterialToObject3D` | Koncisa / General | Aplica acabados, texturas y colores PBR a cualquier malla o GLB. | Permite seleccionar acabados Formica/Madera para la tapa y Metal para las patas. | **Directo (100%)** |
| `src/components/ThreeCanvas.jsx` | `emitBOM` / `addRow` | General / Todos | Consolida ítems, calcula totales y precios por país (`CO`, `EUC`, `USD`). | Cotización automática del ensamble KUO AV en el BOM. | **Directo (100%)** |
| `src/clipboard/clipboardManager.js` | `setClipboard`, `getClipboard` | General | Gestión serializable del portapapeles. | Copiar y pegar estaciones KUO AV completas con Ctrl+C / Ctrl+V. | **Directo (100%)** |
| `src/history/CreateObjectsCommand.js` | `CreateObjectsCommand` | General | Comando para historial Undo/Redo. | Permite deshacer/rehacer creación y eliminación de KUO AV. | **Directo (100%)** |

---

## 12. Funciones que habría que crear específicamente para KUO AV

1. **`buildKuoAV(config)`** (en `src/mepal/kuoAV/builders/KuoAVBuilder.js`):
   - Calcula las posiciones relativas $(X, Y, Z)$ de la tapa perimetral, columnas telescópicas, travesaño extensible, kit fuente y vértebra lateral.
2. **`createKuoAVInstance({ api, config, loadGlb })`** (en `src/mepal/kuoAV/factories/createKuoAVInstance.js`):
   - Instancia el `THREE.Group`, inserta la superficie paramétrica y ensambla los componentes GLB.
3. **`swapKuoAVVariant(instanceId, nextConfig)`** (en `src/components/ThreeCanvas.jsx`):
   - Permite cambiar altura en tiempo real, activar/desactivar la vértebra o el kit fuente preservando la posición de la mesa.
4. **`resolveKuoAVSurfaceCode(anchoMm, fondoMm, espesor, acabado)`** (en `src/mepal/kuoAV/rules/kuoAVSurfaceRules.js`):
   - Resuelve el Part Number comercial de la tapa según dimensiones de cobro.
5. **`resolveKuoAVElevationOffsets(alturaMm)`** (en `src/mepal/kuoAV/rules/kuoAVBaseRules.js`):
   - Calcula el desplazamiento en $Y$ para la tapa, travesaño y accesorios al cambiar la altura (entre 730mm y 1200mm).

---

## PRODUCTO BASE RECOMENDADO

### **Recomendación: 90% Koncisa Plus + 10% Link**

- **Base Arquitectónica Principal: Koncisa Plus.**
  - Debe utilizarse la arquitectura de **Ensambles Paramétricos Híbridos** de Koncisa Plus (`KoncisaPlusBuilder` + `createKoncisaPlusInstance` + `surfaceFactory` + `addSurfaceEdgesToGroup`). Esto garantiza que la superficie sea paramétrica continua, que las patas se separen, que la altura se regule en $Y$ y que el BOM refleje el desglose de subpartes de CET.
- **Referencia Secundaria: Link.**
  - Únicamente para la sencillez del panel lateral de inserción (`LinkPanel.jsx`), adaptándolo para KUO AV.

---

## ARQUITECTURA PROPUESTA PARA KUO AV

```
src/mepal/kuoAV/
├── builders/
│   └── KuoAVBuilder.js            # [NUEVO] Resuelve dimensiones, coordenadas X/Y/Z y partes
├── factories/
│   └── createKuoAVInstance.js     # [NUEVO] Crea THREE.Group, genera tapa procedural y carga GLBs
├── rules/
│   ├── kuoAVSurfaceRules.js       # [NUEVO] Matriz de códigos SAP/CET para tapas
│   ├── kuoAVBaseRules.js          # [NUEVO] Reglas de columnas motorizadas y offsets de elevación Y
│   └── kuoAVAccessoryRules.js     # [NUEVO] Reglas de Kit Fuente, Vértebra y Grommets
├── config/
│   └── kuoAVTunables.js           # [NUEVO] Rangos de altura (730-1200mm), anchos/fondos y rutas GLB
└── parts/
    └── kuoAVParts.js              # [NUEVO] Catálogo de modelos, accesorios y roles

src/components/
├── KuoAVPanel.jsx                 # [NUEVO] Panel lateral de inserción (Ancho, Fondo, Altura inicial)
└── properties/
    └── KuoAVProperties.jsx        # [NUEVO] Popup de edición contextual (Altura, Kit F, Vértebra, etc.)
```

---

## FUNCIONES NUEVAS NECESARIAS

1. `buildKuoAV(config)` en `KuoAVBuilder.js`.
2. `createKuoAVInstance({ api, config, loadGlb })` en `createKuoAVInstance.js`.
3. `resolveKuoAVSurfaceCode(ancho, fondo, espesor, acabado)` en `kuoAVSurfaceRules.js`.
4. `resolveKuoAVElevationOffsets(alturaMm)` en `kuoAVBaseRules.js`.
5. `resolveKuoAVAccessories(config)` en `kuoAVAccessoryRules.js`.
6. `addKuoAV(config)` y `swapKuoAVVariant(instanceId, nextConfig)` en `ThreeCanvas.jsx`.

---

## INFORMACIÓN QUE DEBEMOS OBTENER DE CET/INGENIERÍA

Antes de iniciar la codificación, se requiere obtener:

1. **Modelos 3D GLB:**
   - Columna / Pata Motorizada de Altura Variable (`COLUMNA_MOTORIZADA_AV.glb`).
   - Vértebra Pasacables Lateral (`VERTEBRA_LATERAL.glb`).
   - Kit Fuente de Electrificación (`KIT_FUENTE.glb`).
   - Grommet Pasacables (`GROMMET_AV.glb`).
2. **Cotas de Elevación y Dimensiones:**
   - Altura mínima (ej: 710mm o 730mm) y altura máxima (ej: 1180mm o 1210mm).
   - Rango de anchos estándar (ej: 1200, 1400, 1600, 1800 mm) y fondos (ej: 600, 700, 800 mm).
3. **Lógica de Accesorios:**
   - Definición exacta de *"Elevar kit F izquierdo"* (altura y posición de montaje respecto a la tapa).
   - Lado de fijación y anclaje de la *"Vértebra Lateral"*.
4. **Matriz de Part Numbers CET / SAP:**
   - Tabla de códigos comerciales para tapas según medida/espesor y códigos de kits de electrificación y accesorios.
