# Guía Técnica de Reutilización: Koncisa Plus para KUO GO

---

## 1. Funciones que generan superficies variables

| Archivo | Función / Constante | Qué hace | ¿Se puede reutilizar? | Cómo se reutilizaría en KUO GO |
| :--- | :--- | :--- | :--- | :--- |
| `src/factories/surfaceFactory.js` (Líneas 21-46) | `createSurfaceMesh({ widthM, depthM, thicknessM, color })` | Genera una malla 3D procedural paramétrica (`THREE.BoxGeometry` + `THREE.MeshStandardMaterial`) basada en dimensiones continuas en metros, centrada y apoyada en $Y=0$. | **SÍ (Directamente)** | Para generar tableros de mesas KUO GO con anchos y profundidades variables sin depender de un GLB estático por cada milímetro de medida. |
| `src/factories/surfaceFactory.js` (Líneas 59-78) | `createSurfaceMeta({ widthM, depthM, thicknessM })` | Genera conectores lógicos de snapping (`surface_edge`) en el borde superior y frontal para ensamblar piezas adyacentes. | **SÍ (Directamente)** | Para habilitar snapping magnético entre módulos KUO GO cuando se alineen mesas continuas en layouts colaborativos. |
| `src/components/ThreeCanvas.jsx` (Líneas 8238-8312) | `addSurfaceEdgesToGroup({ group, widthM, depthM, thicknessM, edgeFinish })` | Añade 4 mallas independientes para los cantos (`CANTO_FRONTAL`, `CANTO_POSTERIOR`, `CANTO_IZQUIERDO`, `CANTO_DERECHO`) con grosor de canto configurable (1mm, 2mm, 3mm). | **SÍ (Directamente)** | Permite que las superficies KUO GO tengan cantos de PVC diferenciados de la superficie para render fotorrealista y cotización de cantos. |
| `src/components/ThreeCanvas.jsx` (Líneas 8314-8500) | `addSurface(params, item)` | Orquesta la creación de una superficie dentro de un ensamble: resuelve catálogo, descripción, precio unitario, `instanceId`, metadatos en `userData` y vinculación con `parentGroup`. | **SÍ (Directamente)** | Como método del ThreeCanvas para inyectar la tapa/superficie dentro del grupo raíz del ensamble KUO GO. |
| `src/mepal/koncisaPlus/parts/superficies.js` (Líneas 10-65) | `createSuperficie(config)` | Crea la definición pura de datos (Data Object) de una superficie: `dimMm`, `billingDimMm`, `logicalCode`, `finishCode`, `subtype`, `position` y `rotation`. | **SÍ (Adaptable)** | Como constructor de datos de tapa dentro de `KuoGoBuilder.js`. |

---

## 2. Funciones que generan costados o bases variables

| Archivo | Función / Constante | Qué hace | ¿Se puede reutilizar? | Cómo se reutilizaría en KUO GO |
| :--- | :--- | :--- | :--- | :--- |
| `src/mepal/koncisaPlus/rules/koncisaCostadoRules.js` (Líneas 3-53) | `createCostadoAssembly(config)` | Define la receta de ensamble de una pata/costado compuesta por sub-modelos GLB (`leftLegSrc`, `rightLegSrc`, `centerBracketSrc`, travesaño procedural `crossbar`). | **SÍ (Conceptualmente / Estructuralmente)** | Si las patas de KUO GO se componen de patas izquierda/derecha + travesaño telescópico extensible según el ancho de la mesa. |
| `src/components/ThreeCanvas.jsx` (Líneas 10240-10430) | `loadCostadoModel(options)` | Carga sub-mallas GLB de patas, calcula la separación dinámica en $Z$ y añade el travesaño extruido procedural entre ambas patas. | **SÍ (Directamente si es pata abierta/portería)** | Para estructurar patas KUO GO que se expanden paramétricamente según el fondo ($D40$, $D60$, $D80$). |
| `src/mepal/koncisaPlus/parts/costados.js` (Líneas 12-85) | `createCostado(config)` | Construye el registro abstracto de una pata/costado (`tipo`, `lado`, `forma`, `depthMm`, `x, y, z`, `replaceKey`). | **SÍ (Adaptable)** | Para registrar las bases de KUO GO dentro del array `parts[]` del ensamble. |

---

## 3. Rules relacionadas con medidas, variantes, códigos y componentes

| Archivo | Función / Constante | Qué hace | ¿Se puede reutilizar? | Cómo se reutilizaría en KUO GO |
| :--- | :--- | :--- | :--- | :--- |
| `src/mepal/koncisaPlus/rules/koncisaSurfaceRules.js` (Líneas 3-341) | `KONCISA_SURFACE_RULES` | Diccionario que mapea la clave lógica compuesta `[LINEA][LARGO][ANCHO][FORMA][ESPESOR]-[ACABADO]` a un código comercial real de SAP/PT. | **SÍ (Patrón Exacto)** | Crear `KUOGO_SURFACE_RULES` mapeando `[KUOGO][MODELO][ANCHO][FONDO][ESPESOR]-[ACABADO]` $\to$ Part Number CET / SAP. |
| `src/rules/surfaceRules.js` (Líneas 1-120) | `resolveSurfaceCodigoPT(dim, finishCode, line)` | Función de consulta que normaliza las dimensiones de cobro, busca en la tabla de reglas y retorna el código comercial. | **SÍ (Directamente)** | Crear `resolveKuoGoCodigoPT(...)` usando la misma lógica de lookup de códigos comerciales. |
| `src/mepal/koncisaPlus/rules/koncisaRules.js` (Líneas 25-110) | `getSuperficiesConfig(...)` | Calcula las posiciones espaciales $(X, Y, Z)$ de cada superficie según el número de puestos y tipo de puesto (sencillo/doble). | **SÍ (Adaptable)** | Para posicionar superficies en mesas KUO GO modulares dobles o continuas en isla. |
| `src/mepal/koncisaPlus/rules/koncisaRules.js` (Líneas 115-180) | `getCostadosConfig(...)` | Resuelve la cantidad y posición de patas (iniciales, intermedias compartidas, terminales). | **SÍ (Adaptable)** | Para resolver si una isla de mesas KUO GO lleva patas intermedias compartidas entre puestos adyacentes. |
| `src/mepal/koncisaPlus/rules/koncisaCostadoRules.js` (Líneas 55-775) | `KONCISA_COSTADO_RULES` | Mapeo de códigos comerciales y offsets milimétricos para ensambles de costados y bases. | **SÍ (Patrón Exacto)** | Matriz de códigos de bases y patas para KUO GO según altura y profundidad. |

---

## 4. Builders y Factory utilizados

| Archivo | Función / Clase | Qué hace | ¿Se puede reutilizar? | Cómo se reutilizaría en KUO GO |
| :--- | :--- | :--- | :--- | :--- |
| `src/mepal/koncisaPlus/builders/KoncisaPlusBuilder.js` (Líneas 141-608) | `buildKoncisaPlus(config)` | Motor central de ensamble: recibe la configuración global y genera el grafo completo de sub-piezas (`parts[]`) con sus roles, códigos, geometrías y offsets. | **SÍ (Como Plantilla Arquitectónica)** | Escribir `KuoGoBuilder.js` siguiendo exactamente esta firma: recibe `config` (modelo, medidas, acabado, espesor, accesorios) y retorna `{ groupId, groupName, parts }`. |
| `src/mepal/koncisaPlus/factories/createKoncisaPlusInstance.js` (Líneas 22-362) | `createKoncisaPlusInstance({ api, config, parent, ... })` | Puente entre el Builder y el motor Three.js: invoca a `buildKoncisaPlus`, crea el `THREE.Group` contenedor e inserta cada parte mediante las APIs de `ThreeCanvas`. | **SÍ (Como Plantilla Arquitectónica)** | Escribir `createKuoGoInstance.js` para iterar sobre las partes calculadas por el Builder y construir el ensamble en la escena. |

---

## 5. Sistema de configuración/receta y serialización

| Archivo | Función / Constante | Qué hace | ¿Se puede reutilizar? | Cómo se reutilizaría en KUO GO |
| :--- | :--- | :--- | :--- | :--- |
| `src/mepal/koncisaPlus/serialization/serializeKoncisaPlusRecipe.js` (Líneas 47-70) | `toSerializable(value)` | Limpia recursivamente referencias cíclicas, funciones y objetos Three.js (`THREE.Mesh`, `BufferGeometry`, `Material`) dejando únicamente un objeto plano JSON. | **SÍ (Directamente)** | Para serializar cualquier ensamble o producto KUO GO al portapapeles o archivo de proyecto `.imagina`. |
| `src/mepal/koncisaPlus/serialization/serializeKoncisaPlusRecipe.js` (Líneas 150-350) | `serializeKoncisaPlusAssemblyRecipe(assemblyGroup, parts)` | Extrae la receta completa de un ensamble (configuración inicial, transformadas de cada sub-pieza, acabados aplicados a cantos y tapas, reemplazos de costados). | **SÍ (Patrón Exacto)** | Crear `serializeKuoGoRecipe(group, parts)` para guardar y restaurar exactamente el estado del producto KUO GO con todos sus accesorios. |

---

## 6. Cómo se conserva la configuración de un producto

En Koncisa Plus (y en la arquitectura de IMAGINA), la configuración no se almacena en variables globales volátiles; se almacena directamente en el árbol de Three.js a través de **`userData`**:

1. **En el Grupo Raíz (`THREE.Group`):**
   ```javascript
   group.userData = {
     isPartRoot: true,
     kind: 'KUOGO', // o 'KONCISA_PLUS_ASSEMBLY'
     groupId: 'KUOGO_...',
     groupName: 'Kuo Go Kume200000',
     instanceId: 'uuid-...',
     config: { ...configOriginal }, // Receta completa
     tipoKey: 'Kume200000',
     espesor: 'Espesor Formica 18',
     especial: false,
     dimMm: { widthMm: 1200, depthMm: 600, heightMm: 730 },
     kuoGoParts: [ ...desgloseBOM ],
   };
   ```
2. **En cada Sub-malla o Mesh Hijo (`THREE.Mesh`):**
   - Posee `userData.parentAssemblyId = group.userData.instanceId`.
   - Posee `userData.groupId = group.userData.groupId`.
   - Posee `userData.isSubPart = true` y su categoría (`superficie`, `costado`, `accesorio`).

**Para KUO GO:** Se debe conservar exactamente esta convención. Cuando el usuario hace clic en cualquier parte de la mesa, el sistema sube por el árbol de padres (`mesh.parent`) hasta encontrar `isPartRoot: true` y extrae la configuración completa para abrir `KuoGoProperties.jsx`.

---

## 7. Cómo funcionan actualmente copiar, pegar, rotar y mover

| Operación | Archivo y Función | Cómo funciona en Koncisa Plus | Aplicación en KUO GO |
| :--- | :--- | :--- | :--- |
| **Copiar (Ctrl+C)** | `src/clipboard/clipboardManager.js` → `setClipboard()` | Serializa la receta completa (`config` + `transformOverrides` + `metadata`) sin copiar mallas Three.js. | **100% Reutilizable:** Copia la receta del objeto KUO GO seleccionado. |
| **Pegar (Ctrl+V)** | `src/components/ThreeCanvas.jsx` (Líneas 4200-4350) → `paste()` | Lee la receta del clipboard, genera un nuevo `instanceId` y `groupId`, aplica un offset de desplazamiento $(X+0.3, Z+0.3)$ y ejecuta de nuevo la Factory (`createKuoGoInstance`). | **100% Reutilizable:** Recrea una copia independiente exacta de la mesa KUO GO. |
| **Mover** | `src/components/ThreeCanvas.jsx` (Líneas 5500-5800) → `onPointerMove / drag` | Mueve el `THREE.Group` raíz completo en el plano $XZ$ respetando snapping 2D. No mueve mallas internas por separado. | **100% Reutilizable:** Todo el ensamble KUO GO se desplaza en bloque. |
| **Rotar** | `src/components/ThreeCanvas.jsx` (Líneas 4600-4650) → `rotateObject3D()` | Aplica rotación en incrementos de $90^\circ$ ($\pi/2$) o libre sobre el eje $Y$ del `THREE.Group` raíz y actualiza su matriz mundial (`updateMatrixWorld(true)`). | **100% Reutilizable:** Rota la mesa completa con todos sus componentes. |
| **Deshacer / Rehacer** | `src/history/CreateObjectsCommand.js` | Guarda el estado `before` y `after` de la escena/piezas y ejecuta restauración sin re-renderizar todo el canvas. | **100% Reutilizable.** |

---

## 8. Cómo se manejan metadata, parts[] y BOM

### Flujo de Datos hacia el BOM:
1. Al crearse la pieza o ensamble, se registra en el array interno `parts` de `ThreeCanvas`:
   ```javascript
   parts.push({ code: 'Kume200000', obj: group });
   ```
2. La función `emitBOM()` (`ThreeCanvas.jsx` Líneas 1355-1820) recorre todos los objetos en `parts[]`.
3. Para ensambles con desglose (como Koncisa Plus o KuoGo):
   - Lee `obj.userData.kuoGoParts` (o `obj.userData.typologyParts`).
   - Por cada sub-ítem invoca `addRow(code, qty, description, unitPrice, groupId, groupName, prices, groupCount, groupInstanceId)`.
4. `addRow()` consolida cantidades (`qty`), busca el precio en la lista del país activo (`countryRef.current = 'CO' | 'EUC' | 'USD'`) y calcula `total = unitPrice * qty`.
5. El resultado se emite al estado `bomData` en `App.jsx` y se visualiza en la tabla de cotización / exportación Excel.

---

## 9. Qué componentes utilizan GLB y cuáles se generan proceduralmente

| Componente | Tipo de Renderizado | Justificación Técnica en IMAGINA |
| :--- | :--- | :--- |
| **Superficies Rectangulares** | **Procedural** (`THREE.BoxGeometry`) | Permite dimensiones milimétricas continuas ($1000 \dots 2400\text{ mm}$) sin crear cientos de archivos GLB. |
| **Cantos de Superficie** | **Procedural** (`THREE.BoxGeometry`) | Permite variar el espesor del canto (1mm, 2mm, 3mm) y su acabado de forma independiente. |
| **Costados / Patas Complejas** | **GLB** (`.glb`) | Geometría fija con chaflanes, troqueles, niveladores y curvaturas que serían ineficientes de programar por código. |
| **Travesaños de Pata** | **Procedural** (`THREE.BoxGeometry`) | Se estiran proceduralmente entre las patas izquierda y derecha según el fondo del costado. |
| **Ductos de Electrificación** | **Procedural** (`THREE.BoxGeometry`) | Longitud variable adaptada exactamente al ancho de la mesa. |
| **Accesorios Fijos (Grommets, Cajas)** | **GLB** (`.glb`) | Modelos de inyección de plástico/aluminio estandarizados. |

---

## 10. Qué código existente podemos reutilizar directamente para KUO GO

1. **`src/factories/surfaceFactory.js`**: `createSurfaceMesh` y `createSurfaceMeta` para tapas paramétricas.
2. **`src/components/ThreeCanvas.jsx`**:
   - `addSurface` y `addSurfaceEdgesToGroup` para armar tapas con cantos.
   - `loadExistingGlb` para cargar patas y accesorios GLB de `/assets/models/Kuo GO/`.
   - `emitBOM` y `addRow` para cotización y cálculo automático de precios multidivisa.
   - `swapKuoGoVariant` para cambios de variantes en caliente.
3. **`src/materials/applyMaterial.js`**: `applyMaterialToObject3D` para pintar superficies y bases con las texturas del catálogo Mepal.
4. **`src/clipboard/clipboardManager.js`** y **`src/history/`**: Soporte completo de Ctrl+C / Ctrl+V y Undo / Redo sin escribir código nuevo.
5. **`src/components/properties/PropertiesPopup.jsx`**: Marco de edición contextual flotante.

---

## 11. Qué funciones nuevas serían necesarias para KUO GO

1. **`src/mepal/kuoGo/rules/kuoGoSurfaceRules.js` (NUEVO)**:
   - `resolveKuoGoSurfaceCode(modelo, ancho, fondo, espesor, acabado)`: Para resolver el código comercial exacto de la tapa.
2. **`src/mepal/kuoGo/rules/kuoGoBaseRules.js` (NUEVO)**:
   - `resolveKuoGoBaseCode(tipoBase, fondo, altura, acabado)`: Para resolver códigos de patas/bases y sus rutas GLB correspondientes.
3. **`src/mepal/kuoGo/builders/KuoGoBuilder.js` (EXPANSIÓN)**:
   - Capacidad de devolver múltiples partes en `parts[]` (Tapa + Patas + Pasacables + Canaleta + Accesorios CET) en lugar de un único GLB rígido.
4. **`src/mepal/kuoGo/serialization/serializeKuoGoRecipe.js` (NUEVO)**:
   - Función para clonar y serializar recetas completas de estaciones KUO GO.

---

## 12. Qué información falta para implementar KUO GO al 100%

1. **Matriz de Códigos CET / SAP:**
   - Tabla oficial de Part Numbers que relacione cada combinación (Modelo + Medida Ancho/Fondo + Espesor Formica/Melamina + Acabado) con su código de producto y precio.
2. **Desglose de Sub-componentes CET:**
   - Listado de qué accesorios opcionales (cajas de tomas, pasacables, faldones, pantallas divisorias) aplican a cada modelo KUO GO.
3. **Modelos GLB de Patas Desglosadas:**
   - Si se desea KUO GO con ancho paramétrico milimétrico continuo (ej. 1350 mm), se requieren los GLB de las patas independientes para que el travesaño y la tapa se estiren proceduralmente como en Koncisa Plus.

---

## PLAN RECOMENDADO PARA KUO GO

```
┌─────────────────────────────────────────────────────────────────────────┐
│              FASE 1: Arquitectura de Reglas y Catálogo                 │
│  1. Crear `src/mepal/kuoGo/rules/kuoGoSurfaceRules.js` con matriz CET. │
│  2. Crear `src/mepal/kuoGo/rules/kuoGoBaseRules.js` con códigos base.   │
│  3. Registrar modelos disponibles en `kuoGoParts.js`.                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              FASE 2: Builder Paramétrico Modular                        │
│  1. Expandir `KuoGoBuilder.js` para soportar:                           │
│     - Modo Monobloque (GLB completo como formica18.glb).                │
│     - Modo Paramétrico (Tapa procedural + Patas GLB + Accesorios).      │
│  2. Retornar array `parts[]` con metadatos CET (Part Number, Tag, Qty). │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              FASE 3: Factory y Ensamble Three.js                        │
│  1. Adaptar `createKuoGoInstance.js` para instanciar el grupo raíz.     │
│  2. Inyectar `userData.kuoGoParts` para compatibilidad directa con BOM. │
│  3. Soportar acabados superficiales vía `applyMaterialToObject3D`.      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              FASE 4: Panel UI y Propiedades Contextuales                │
│  1. Completar selectores en `KuoGoPanel.jsx` (Largo, Fondo, Acabado).   │
│  2. Mantener estado local reactivo en `KuoGoProperties.jsx`.            │
│  3. Validar swaps en caliente con `swapKuoGoVariant`.                   │
└─────────────────────────────────────────────────────────────────────────┘
```
