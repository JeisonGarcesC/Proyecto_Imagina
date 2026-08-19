# Plan Maestro de Implementación: KUO AV - Superficie Perimetral

---

> [!IMPORTANT]
> **Lineamiento Rector:** KUO AV será implementado como un **Ensamble Paramétrico Híbrido** tomando como base arquitectónica a **Koncisa Plus**. No se utilizarán GLB monolíticos por medida. La superficie será procedural continua con cantos independientes, las columnas motorizadas y accesorios se cargarán como GLB fijos posicionados matemáticamente, y el BOM se desglosará automáticamente por sub-piezas.

---

# 1. Archivos nuevos que debemos crear

```
src/mepal/kuoAV/
├── builders/
│   └── KuoAVBuilder.js            # [NUEVO] Motor matemático que calcula geometría, offsets y lista de partes
├── factories/
│   └── createKuoAVInstance.js     # [NUEVO] Instanciador 3D (THREE.Group, mallas procedurales y carga de GLBs)
├── rules/
│   ├── kuoAVSurfaceRules.js       # [NUEVO] Matriz de códigos SAP/CET para tapas según medidas y espesor
│   ├── kuoAVBaseRules.js          # [NUEVO] Reglas de columnas de elevación, offsets Y y travesaño telescópico
│   └── kuoAVAccessoryRules.js     # [NUEVO] Reglas de Kit Fuente, Vértebra y Grommets
├── config/
│   └── kuoAVTunables.js           # [NUEVO] Constantes, límites de altura (730-1200mm), medidas estándar y rutas
└── parts/
    └── kuoAVParts.js              # [NUEVO] Definiciones de catálogo, roles y metadatos de accesorios

src/components/
├── KuoAVPanel.jsx                 # [NUEVO] Panel lateral de inserción (ancho, fondo, altura inicial, accesorios)
└── properties/
    └── KuoAVProperties.jsx        # [NUEVO] Panel flotante de edición contextual reactiva
```

---

# 2. Archivos existentes que debemos modificar

| Archivo | Sección / Función | Modificación Requerida |
| :--- | :--- | :--- |
| `src/components/LeftPanel.jsx` | Bloque de renderizado de pestañas laterales | Importar e integrar `<KuoAVPanel onCreate={...} />` cuando `activeTab === 'kuoAlturaVariable'`. |
| `src/components/ThreeCanvas.jsx` | Objeto de API expuesta (`onApiReady`) | Exponer métodos `addKuoAV` y `swapKuoAVVariant`. |
| `src/components/ThreeCanvas.jsx` | Función `emitBOM` (Línea ~1700) | Agregar evaluador `if (obj.userData?.kind === 'KUO_AV_ASSEMBLY')` para iterar `obj.userData.kuoAVParts` e invocar `addRow()`. |
| `src/components/properties/PropertiesPopup.jsx` | Verificación de edición e importación | Agregar `isKuoAVEditablePart(part)` e incrustar `<KuoAVProperties part={part} api={api} onClose={onClose} />`. |

---

# 3. Funciones existentes que reutilizaremos

| Archivo | Función | Qué hace | Cómo se reutiliza en KUO AV |
| :--- | :--- | :--- | :--- |
| `src/factories/surfaceFactory.js` (Línea 21) | `createSurfaceMesh` | Genera una caja 3D procedural paramétrica (`THREE.BoxGeometry`) en metros. | Genera la tapa perimetral de KUO AV en cualquier medida sin archivos GLB estáticos. |
| `src/factories/surfaceFactory.js` (Línea 59) | `createSurfaceMeta` | Crea conectores de snap perimetral (`surface_edge`). | Permite unir y alinear mesas KUO AV con snap magnético en layouts colaborativos. |
| `src/components/ThreeCanvas.jsx` (Línea 8238) | `addSurfaceEdgesToGroup` | Añade 4 mallas independientes de cantos de PVC con grosor configurable (1mm, 2mm, 3mm). | Provee cantos fotorrealistas con material diferenciado para la tapa de KUO AV. |
| `src/components/ThreeCanvas.jsx` (Línea 8314) | `addSurface` | Crea el grupo de superficie, asigna `instanceId`, resuelve precios y empaqueta `userData`. | Inserción formal de la tapa dentro del ensamble KUO AV. |
| `src/components/ThreeCanvas.jsx` (Línea 2222) | `loadExistingGlb` | Carga asíncrona segura de archivos GLB con verificación de encabezados HTTP. | Carga de las columnas de elevación, vértebra pasacables, kit fuente y grommets. |
| `src/materials/applyMaterial.js` (Línea 90) | `applyMaterialToObject3D` | Aplica mapas de texturas, color y rugosidad sobre mallas Three.js y GLB. | Cambio en tiempo real de acabados Formica/Madera (tapa) y Pinturas (patas). |
| `src/components/ThreeCanvas.jsx` (Línea 1355) | `emitBOM` / `addRow` | Motor consolidado de lista de materiales, cantidades y precios multidivisa (`CO`, `EUC`, `USD`). | Cotización automática del ensamble completo de KUO AV. |
| `src/clipboard/clipboardManager.js` | `setClipboard`, `getClipboard` | Portapapeles serializable JSON. | Copiar y pegar estaciones KUO AV completas con Ctrl+C / Ctrl+V. |
| `src/history/CreateObjectsCommand.js` | `CreateObjectsCommand` | Registro de comandos en el historial global. | Deshacer y Rehacer creación, eliminación y modificaciones de KUO AV. |

---

# 4. Funciones nuevas que debemos crear

1. **`buildKuoAV(config)`** (en `KuoAVBuilder.js`):
   - Motor determinístico de ensamble: calcula las coordenadas espaciales $(X, Y, Z)$ de la tapa procedural, las dos columnas de elevación, la viga extensible, el kit fuente, la vértebra y los grommets.
2. **`createKuoAVInstance({ api, config, loadGlb })`** (en `createKuoAVInstance.js`):
   - Factoría que construye el `THREE.Group`, inserta la superficie con `api.addSurface`, carga los GLBs de accesorios mediante `loadGlb` y configura `userData.kuoAVParts`.
3. **`addKuoAV(config)`** (en `ThreeCanvas.jsx`):
   - Punto de entrada para posicionar una nueva mesa KUO AV en el canvas, encuadrar cámara y disparar el BOM.
4. **`swapKuoAVVariant(instanceId, nextConfig)`** (en `ThreeCanvas.jsx`):
   - Reemplaza en caliente el ensamble cuando el usuario altera la altura, espesor o activa/desactiva accesorios, preservando `instanceId`, posición mundial y rotación.
5. **`resolveKuoAVSurfaceCode(anchoMm, fondoMm, espesor, acabado)`** (en `kuoAVSurfaceRules.js`):
   - Resuelve el código comercial exacto de la tapa según dimensiones de cobro.
6. **`resolveKuoAVElevationOffsets(alturaMm)`** (en `kuoAVBaseRules.js`):
   - Calcula el desplazamiento relativo en $Y$ para la tapa, travesaño y accesorios cuando se ajusta la altura motorizada.

---

# 5. Qué información debe recibir `KuoAVBuilder`

El Builder debe recibir un objeto `config` normalizado con los siguientes campos:

```javascript
const config = {
  // Dimensiones físicas reales (para 3D)
  anchoRealMm: 1400,            // Rango continuo (ej: 1200 - 1800 mm)
  fondoRealMm: 700,             // Rango continuo (ej: 600 - 800 mm)
  alturaMm: 730,                // Altura activa (730 a 1200 mm)
  
  // Dimensiones de cobro (para SAP / Catálogo)
  anchoCobroMm: 1400,
  fondoCobroMm: 700,
  
  // Acabados y superficie
  espesor: 'Espesor Formica 25', // 'Espesor Formica 18' | 'Espesor Formica 25' | 'Espesor Formica 30'
  finishCode: '22008689',
  cantoFinish: 'PVC-2MM',
  especial: false,              // Booleano Especial / Rematable
  
  // Accesorios CET
  kitFuente: true,              // Booleano: incluye kit de electrificación
  elevarKitFIzquierdo: false,   // Booleano: eleva el kit fuente sobre la superficie
  acabadoGrommet: 'ALUMINIUM',  // 'ALUMINIUM' | 'BLACK' | 'WHITE'
  vertebraLateral: true,        // Booleano: pasacables vertical articulado
  ladoVertebra: 'IZQ',          // 'IZQ' | 'DER'
  
  // Identidad de instancia (para swaps)
  instanceId: 'uuid-...',
  groupId: 'KUO_AV_...',
};
```

---

# 6. Cómo debe construirse la superficie paramétrica

1. **Sin GLB Estático:** La tapa se construye con `createSurfaceMesh` (`src/factories/surfaceFactory.js`).
2. **Cálculo de Cotas:**
   - $\text{Ancho } X = \text{anchoRealMm} / 1000$ (en metros).
   - $\text{Fondo } Z = \text{fondoRealMm} / 1000$ (en metros).
   - $\text{Espesor } Y = \text{thickMm} / 1000$ ($0.018$, $0.025$, $0.030$).
3. **Elevación de la Tapa:**
   - La posición $Y$ del centro de la tapa se calcula como:
     $$Y_{\text{tapa}} = \frac{\text{alturaMm} - (\text{thickMm} / 2)}{1000}$$
4. **Cantos de PVC:**
   - Se invoca `addSurfaceEdgesToGroup` pasando las dimensiones en metros y `edgeFinish`.

---

# 7. Cómo deben posicionarse las bases/columnas

1. **Modelos GLB Fijos:** Las columnas telescópicas motorizadas izquierda y derecha provienen de un GLB base (`COLUMNA_MOTORIZADA.glb`).
2. **Posicionamiento en $X$ y $Z$:**
   - Inset lateral estándar (sangría respecto al borde de la tapa, ej. $50\text{ mm}$):
     $$X_{\text{col\_izq}} = -\frac{\text{anchoRealMm}}{2} + \text{insetXMm}$$
     $$X_{\text{col\_der}} = +\frac{\text{anchoRealMm}}{2} - \text{insetXMm}$$
     $$Z_{\text{col}} = 0 \quad (\text{centradas en el fondo})$$
3. **Travesaño Telescópico Bajo Tapa:**
   - Se genera una viga procedural `BoxGeometry` entre ambas columnas:
     $$\text{Largo Travesaño} = (\text{anchoRealMm} - 2 \cdot \text{insetXMm})$$
   - Se ubica justo debajo de la superficie a la altura activa $Y$.

---

# 8. Cómo deben manejarse los cambios de altura

1. **Rango de Altura:** Definido en `kuoAVTunables.js` ($\text{Mínimo: } 730\text{ mm}$, $\text{Máximo: } 1200\text{ mm}$).
2. **Comportamiento en 3D:**
   - Las zapatas/patines inferiores de las columnas se mantienen fijos en el piso ($Y = 0$).
   - La sección extensible superior de las columnas, la viga telescópica, la tapa, el kit fuente y los grommets se trasladan en $Y$ según `alturaMm`.
   - La **Vértebra Lateral Articulada** se estira o añade segmentos en $Y$ cubriendo la distancia entre el piso ($Y = 0$) y la base inferior de la tapa.
3. **Actualización en Tiempo Real:**
   - El slider de altura en `KuoAVProperties.jsx` invoca `api.swapKuoAVVariant(part.instanceId, { alturaMm: nuevaAltura })`.

---

# 9. Cómo deben manejarse los accesorios

| Accesorio | Tipo de Render | Regla de Posicionamiento y Visibilidad |
| :--- | :--- | :--- |
| **Kit Fuente** | GLB (`KIT_FUENTE.glb`) | Si `kitFuente === true`, se ancla bajo la tapa centrado en $Z$. Si `elevarKitFIzquierdo === true`, se posiciona sobre la superficie en el extremo izquierdo. |
| **Vértebra Lateral** | GLB (`VERTEBRA_LATERAL.glb`) | Si `vertebraLateral === true`, se ubica en $X_{\text{izq}}$ o $X_{\text{der}}$ con su base en $Y=0$ y extremo superior anclado bajo la tapa. |
| **Grommets** | GLB (`GROMMET.glb`) | Si `acabadoGrommet !== 'NONE'`, se posicionan en los troqueles perimetrales traseros de la tapa ($Z = -\text{fondo}/2 + 50\text{ mm}$). |

---

# 10. Cómo debe guardarse la configuración (Ciclo de Vida y Persistencia)

Se utiliza el estándar de `userData` del proyecto:

1. **Estructura Raíz:**
   ```javascript
   puestoGroup.userData = {
     isPartRoot: true,
     kind: 'KUO_AV_ASSEMBLY',
     instanceId: 'uuid-...',
     groupId: 'KUO_AV_...',
     groupName: 'Kuo AV Superficie Perimetral',
     config: { ...configSnapshot },
     kuoAVParts: [ ...desgloseBOM ],
   };
   ```
2. **Copiar y Pegar:** `clipboardManager.js` serializa `userData.config` con `toSerializable()`. Al pegar, `ThreeCanvas` crea una nueva instancia con nuevo `instanceId` y offset.
3. **Mover y Rotar:** Se aplican transformaciones directamente sobre el `THREE.Group` contenedor.
4. **Undo / Redo:** `CreateObjectsCommand.js` registra el grupo completo sin requerir lógica adicional.

---

# 11. Cómo debe generarse el BOM

En `ThreeCanvas.jsx` (Línea ~1700 dentro de `emitBOM`):

```javascript
if (obj.userData?.kind === 'KUO_AV_ASSEMBLY') {
  const parentCode = normalizeText(obj.userData?.codigoPT || obj.userData?.code || p.code || '');
  const label = obj.userData?.name || `Kuo AV ${parentCode}`;
  const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;
  const list = obj.userData?.kuoAVParts || [];

  if (Array.isArray(list) && list.length) {
    for (const it of list) {
      addRow(
        String(it.code),
        Number(it.qty || 1),
        it.description,
        it.unitPrice,
        parentCode,
        label,
        it.prices,
        null,
        groupInstanceId
      );
    }
  }
  continue;
}
```

---

# 12. Cómo deben resolverse códigos y precios

1. **Tapa Perimetral:** Resuelta por `resolveKuoAVSurfaceCode(...)` según medidas de cobro y acabado.
2. **Estructura de Elevación:** Código comercial fijo según rango de ancho ($1200\text{ mm}$ o $1800\text{ mm}$).
3. **Accesorios:** Cada accesorio activo (Kit Fuente, Vértebra, Grommet) aporta su propio código PT y precio unitario independiente al desglose del BOM.
4. **Precios por País:** Se leen automáticamente desde `PriceList_CO.xml`, `PriceList_EUC.xml` y `PriceList_USD.xml` en `src/data/priceListLoader.js`.

---

# 13. Qué datos deben venir de CET / Ingeniería

1. **Rango Oficial de Alturas:** Altura mínima exacta (ej: 710mm o 730mm) y altura máxima (ej: 1180mm o 1200mm).
2. **Archivos 3D GLB:**
   - Columna Telescópica Motorizada (`COLUMNA_MOTORIZADA.glb`).
   - Vértebra Pasacables Lateral (`VERTEBRA_LATERAL.glb`).
   - Kit Fuente (`KIT_FUENTE.glb`).
   - Grommet Pasacables (`GROMMET.glb`).
3. **Matriz de Códigos CET:** Tabla de Part Numbers para tapas, estructuras y accesorios.

---

# 14. Qué datos NO debemos inventar

- **NO** inventar códigos SKU o Part Numbers ficticios de SAP.
- **NO** inventar precios unitarios arbitrarios.
- **NO** inventar mallas 3D de patas motorizadas si existen modelos CAD oficiales.
- **NO** forzar un GLB estático para la tapa: debe construirse de forma procedural continua.

---

# 15. Orden exacto de implementación

```
Fase 1: Capa de Reglas y Catálogo Base
  ├── 1.1. Crear `src/mepal/kuoAV/config/kuoAVTunables.js`.
  ├── 1.2. Crear `src/mepal/kuoAV/parts/kuoAVParts.js`.
  └── 1.3. Crear `src/mepal/kuoAV/rules/kuoAVSurfaceRules.js` y `kuoAVBaseRules.js`.

Fase 2: Motor de Ensamble (Builder y Factory)
  ├── 2.1. Crear `src/mepal/kuoAV/builders/KuoAVBuilder.js`.
  └── 2.2. Crear `src/mepal/kuoAV/factories/createKuoAVInstance.js`.

Fase 3: Integración en ThreeCanvas
  ├── 3.1. Implementar `addKuoAV` y `swapKuoAVVariant` en `ThreeCanvas.jsx`.
  └── 3.2. Añadir soporte para `KUO_AV_ASSEMBLY` en `ThreeCanvas.emitBOM()`.

Fase 4: UI de Inserción y Panel de Propiedades
  ├── 4.1. Crear `src/components/KuoAVPanel.jsx` y vincularlo en `LeftPanel.jsx`.
  ├── 4.2. Crear `src/components/properties/KuoAVProperties.jsx`.
  └── 4.3. Vincular `KuoAVProperties` dentro de `PropertiesPopup.jsx`.

Fase 5: Validaciones y Pruebas
  ├── 5.1. Validar ajuste continuo de altura (730-1200mm).
  ├── 5.2. Validar conmutación de Kit Fuente, Vértebra y Grommets.
  └── 5.3. Validar BOM, exportación a Excel, DXF, Copiar/Pegar y Undo/Redo.
```

---

## PRIMERA IMPLEMENTACIÓN

El primer archivo que debemos crear una vez aprobado el plan es:

### **`src/mepal/kuoAV/config/kuoAVTunables.js`**

**Qué debe hacer:**
1. Definir la ruta base de assets `/assets/models/Kuo AV/`.
2. Declarar las constantes de rango de altura (`ALTURA_MIN_MM: 730`, `ALTURA_MAX_MM: 1200`, `ALTURA_DEFAULT_MM: 730`).
3. Declarar las dimensiones estándar iniciales (Anchos: 1200, 1400, 1600, 1800 mm; Fondos: 600, 700, 800 mm; Espesores: 18, 25, 30 mm).
4. Declarar los identificadores de acabados de grommet y accesorios (`KIT_FUENTE`, `VERTEBRA`).

Este archivo servirá como punto de apoyo y contrato de constantes para todo el Builder y los componentes de UI posteriores.
