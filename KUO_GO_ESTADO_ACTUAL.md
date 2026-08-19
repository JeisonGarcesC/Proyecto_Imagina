# Estado Actual de KUO GO: Diagnóstico Técnico, Brechas y Hoja de Ruta

---

## 1. Qué código de KUO GO ya existe actualmente

Actualmente KUO GO cuenta con una integración funcional basada en la arquitectura modular de IMAGINA (`Builders + Factories + Tunables + Parts + UI Panels + Properties`):

```
┌────────────────────────────────────────────────────────────────────────┐
│ UI: LeftRail.jsx / LeftPanel.jsx -> KuoGoPanel.jsx                    │
│     ├── Inserción en escena: api.addKuoGo(config)                     │
│                                                                        │
│ Canvas 3D: ThreeCanvas.jsx                                             │
│     ├── Carga & Posicionamiento: addKuoGo()                           │
│     ├── Swap en Caliente: swapKuoGoVariant(instanceId, nextConfig)    │
│     └── Registro en BOM: emitBOM()                                    │
│                                                                        │
│ Capa Lógica: src/mepal/kuoGo/                                          │
│     ├── builders/KuoGoBuilder.js                                      │
│     ├── factories/createKuoGoInstance.js                              │
│     ├── config/kuoGoTunables.js                                       │
│     └── parts/kuoGoParts.js                                           │
│                                                                        │
│ Edición Contextual: PropertiesPopup.jsx -> KuoGoProperties.jsx         │
│     └── Control reactivo local de Espesor, Modelo y Especial/Rematable│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Qué archivos existen en `src/mepal/kuoGo/`

| Archivo | Propósito Técnico | Estado Actual |
| :--- | :--- | :--- |
| `src/mepal/kuoGo/builders/KuoGoBuilder.js` | Función `buildKuoGo(config)`. Recibe opciones (`tipoKey`, `espesor`, `especial`, `instanceId`, `groupId`), valida el tipo y retorna `{ groupId, groupName, parts }`. | **Operativo (Monolítico)**: Retorna 1 sola parte en `parts[]`. |
| `src/mepal/kuoGo/factories/createKuoGoInstance.js` | Función `createKuoGoInstance({ config, loadGlb, country })`. Ejecuta el builder, invoca `loadGlb` y configura `object.userData` con `kind: 'KUOGO'` y `kuoGoParts`. | **Operativo**: Carga el GLB y empaqueta metadatos para Three.js y BOM. |
| `src/mepal/kuoGo/config/kuoGoTunables.js` | Constantes `KUOGO_TUNABLES` (`GLB_BASE: '/assets/models/Kuo GO/'`, `ESPESORES`), y funciones `buildGLBFilename` y `buildGLBPath`. | **Operativo**: Mapea los 4 espesores a los archivos `.glb`. |
| `src/mepal/kuoGo/parts/kuoGoParts.js` | Catálogo `KUOGO_MODELOS`. Contiene la definición del modelo base `Kume200000`. | **Básico**: Solo tiene registrado 1 modelo (`Kume200000`). |

---

## 3. Qué GLB de KUO GO existen actualmente

Ubicación en el proyecto: `public/assets/models/Kuo GO/`

| Archivo GLB | Tamaño | Descripción / Contenido |
| :--- | :--- | :--- |
| `formica18.glb` | 141 KB | Modelo completo monobloque de mesa KUO GO con tapa en Formica 18mm y estructura de patas. |
| `formica25.glb` | 141 KB | Modelo completo monobloque con tapa en Formica 25mm y estructura de patas. |
| `formica30.glb` | 141 KB | Modelo completo monobloque con tapa en Formica 30mm y estructura de patas. |
| `melamina25.glb` | 141 KB | Modelo completo monobloque con tapa en Melamina 25mm y estructura de patas. |

---

## 4. Cómo se están cargando actualmente esos GLB

1. El usuario interactúa desde **`KuoGoPanel.jsx`** o **`KuoGoProperties.jsx`**.
2. Se llama a `createKuoGoInstance` pasando la función `loadExistingGlb` inyectada desde `ThreeCanvas.jsx`.
3. `loadExistingGlb` (`ThreeCanvas.jsx` Líneas 2222-2250) ejecuta un `fetch(url)` que verifica encabezados `Content-Type` para evitar errores de falso 200 de Vite y parsea el binario con `GLTFLoader.parse()`.
4. El objeto 3D (`THREE.Group` / `THREE.Object3D`) se añade a `scene` o `parentGroup`, se clona la posición/rotación previa en caso de swap y se registra en `parts[]`.

---

## 5. Qué componentes actualmente son rígidos y cuáles ya son paramétricos

| Componente | Estado Actual | Diagnóstico |
| :--- | :--- | :--- |
| **Tapa / Superficie** | **Rígida (Discreta por GLB)** | No se genera proceduralmente con `createSurfaceMesh`. Cambia cargando un archivo GLB completo diferente (`formica18`, `formica25`, etc.). |
| **Bases / Patas** | **Rígidas (Integradas en GLB)** | Están fusionadas dentro del mismo GLB de la tapa. No se pueden estirar en $X$ o $Z$ ni separar independientemente. |
| **Espesor** | **Paramétrico Discreto** | Conectado a la UI; alterna dinámicamente entre 18mm, 25mm, 30mm y melamina 25mm. |
| **Medidas Ancho / Fondo / Alto** | **Rígidas** | Dimensiones fijas pre-horneadas en la malla del GLB. |
| **Materiales / Acabados** | **Rígidos** | Utilizan los materiales originales incrustados en el GLB sin pasar por `applyMaterialToObject3D`. |
| **Identidad / Swaps** | **Dinámico (Paramétrico)** | Preserva `instanceId`, `position`, `rotation`, `scale` y actualiza el BOM automáticamente. |

---

## 6. Qué funciones de Koncisa Plus ya está utilizando KUO GO

| Función / Módulo | Archivo | Cómo se usa actualmente en KUO GO |
| :--- | :--- | :--- |
| `loadExistingGlb` | `src/components/ThreeCanvas.jsx` (Línea 2222) | Carga y parseo seguro de modelos GLB. |
| `emitBOM` / `addRow` | `src/components/ThreeCanvas.jsx` (Líneas 1355-1820) | Generación automática de BOM, consolidación de cantidades y precios por país. |
| `PropertiesPopup` | `src/components/properties/PropertiesPopup.jsx` | Marco de popup contextual con cierre por clic exterior / Escape. |
| `CreateObjectsCommand` | `src/history/CreateObjectsCommand.js` | Historial global de Undo / Redo para creación y eliminación. |

---

## 7. Qué falta para convertir KUO GO en un producto realmente paramétrico

Para que KUO GO sea 100% paramétrico como Koncisa Plus (dimensiones continuas milimétricas, tapas y patas independientes):

1. **Separación de Geometría:**
   - La tapa debe generarse con `createSurfaceMesh` (`src/factories/surfaceFactory.js`) y cantos con `addSurfaceEdgesToGroup`.
   - Las patas deben ser modelos GLB modulares o geometrías extruidas posicionales.
2. **Matriz de Reglas de Superficies CET:**
   - Crear tabla de lookup que resuelva el código PT comercial según dimensiones exactas y acabado.
3. **Control de Acabados Texturizados:**
   - Conectar selectores de acabados Formica/Madera con `applyMaterialToObject3D`.
4. **Desglose Multicomponente en BOM:**
   - Devolver array con desglose de subpartes (`Tapa`, `Patas`, `Herrajes`, `Pasacables`).

---

## 8. Qué partes NO debemos modificar porque ya funcionan

1. **`src/components/ThreeCanvas.jsx` (`addKuoGo` y `swapKuoGoVariant`)**:
   - El ciclo de vida de inserción, conservación de `instanceId`, `position`, `rotation`, `scale`, sincronización de `userData` y disparo de `emitBOM` es totalmente estable.
2. **`src/components/properties/KuoGoProperties.jsx`**:
   - El manejo de estado local reactivo (`useState` + `useEffect`) garantiza que los dropdowns respondan de forma instantánea sin revertirse.
3. **`src/components/LeftRail.jsx` y `src/components/LeftPanel.jsx`**:
   - La navegación del menú lateral, el icono y la pestaña de activación de KUO GO están perfectamente enlazados.

---

## 9. Qué archivos nuevos habría que crear

1. **`src/mepal/kuoGo/rules/kuoGoSurfaceRules.js`**:
   - Matriz de equivalencias: `[MODELO][ANCHO][FONDO][ESPESOR]-[ACABADO] -> CodigoPT / Part Number CET`.
2. **`src/mepal/kuoGo/rules/kuoGoBaseRules.js`**:
   - Reglas de selección de bases y patas según altura y profundidad.
3. **`src/mepal/kuoGo/catalog/kuoGoCatalog.js`**:
   - Catálogo ampliado de tipologías KUO GO para mostrar en el panel izquierdo.
4. **`src/mepal/kuoGo/serialization/serializeKuoGoRecipe.js`**:
   - Serializador de recetas de ensamble para persistencia y portapapeles.

---

## 10. Qué archivos existentes habría que modificar

| Archivo | Función / Sección | Modificación Requerida |
| :--- | :--- | :--- |
| `src/mepal/kuoGo/parts/kuoGoParts.js` | `KUOGO_MODELOS` | Añadir todos los modelos comerciales de la familia KUO GO. |
| `src/mepal/kuoGo/config/kuoGoTunables.js` | `KUOGO_TUNABLES` | Añadir dimensiones estándar (anchos: 120, 140, 160, 180; fondos: 60, 70, 80; alturas). |
| `src/mepal/kuoGo/builders/KuoGoBuilder.js` | `buildKuoGo` | Evolucionar de devolver 1 pieza estática a resolver ensamble completo (Tapa + Patas + Accesorios). |
| `src/mepal/kuoGo/factories/createKuoGoInstance.js` | `createKuoGoInstance` | Soportar ensamble jerárquico (`THREE.Group`) con subpartes. |
| `src/components/KuoGoPanel.jsx` | `KuoGoPanel` | Añadir selectores de medidas y modelos antes de insertar. |

---

## BLOQUEADORES

Antes de implementar la lógica paramétrica y comercial definitiva de KUO GO, se requiere que el equipo de ingeniería / producto suministre:

1. **Matriz de Part Numbers Oficiales CET / SAP:**
   - Tabla que cruce: `Modelo` $\times$ `Dimensiones (Ancho x Fondo)` $\times$ `Espesor (18, 25, 30mm)` $\times$ `Acabado` $\longrightarrow$ `Part Number / Código SAP`.
2. **Estructura de Precios en XML / Catálogo:**
   - Confirmar si los códigos de KUO GO ya están cargados en los XML de listas de precios (`PriceList_CO.xml`, `PriceList_EUC.xml`, `PriceList_USD.xml`) o si vendrán directamente desde el objeto CET (`List`, `Ext. List`, `Total Sell`).
3. **Definición Geométrica de Modelos:**
   - Aclarar si KUO GO se mantendrá como **modelos discretos por catálogo GLB** (similar a Link) o si requiere **dimensionamiento paramétrico continuo milimétrico** (similar a Koncisa Plus).
4. **Modelos 3D GLB Adicionales:**
   - Si existen más tipologías (mesas redondas, mesas de reunión, mesas con faldón o pasacables), suministrar los archivos GLB correspondientes.

---

## ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
Paso 1: Definición de Catálogo y Reglas (Sin tocar 3D)
  ├── 1.1. Obtener matriz de Part Numbers de ingeniería.
  ├── 1.2. Crear `kuoGoParts.js` con todos los modelos comerciales.
  └── 1.3. Crear `kuoGoSurfaceRules.js` para mapeo automático de códigos.

Paso 2: Expansión de Tunables y Rutas
  ├── 2.1. Organizar carpetas de GLBs en `/public/assets/models/Kuo GO/`.
  └── 2.2. Configurar `kuoGoTunables.js` para mapear modelos, entregas y espesores.

Paso 3: Evolución del Builder y Factory
  ├── 3.1. Adaptar `KuoGoBuilder.js` para generar el desglose de subpartes (`kuoGoParts`).
  └── 3.2. Adaptar `createKuoGoInstance.js` para registrar metadatos CET en `userData`.

Paso 4: UI de Configuración y Propiedades
  ├── 4.1. Añadir selectores de modelo, medidas y acabados en `KuoGoPanel.jsx`.
  └── 4.2. Expandir `KuoGoProperties.jsx` para permitir cambios de acabados y accesorios en caliente.

Paso 5: Validación y Pruebas de Integración
  ├── 5.1. Validar cotización en `emitBOM` (cantidades, descripciones y precios multidivisa).
  ├── 5.2. Validar exportación a DXF y Excel.
  └── 5.3. Validar historial (Undo/Redo) y Clipboard (Copiar/Pegar).
```
