# Diagnóstico Geométrico y Paramétrico: KUO AV - Superficie Perimetral

---

## 1. Auditoría Geométrica de Componentes y Modelos 3D (GLB)

| Componente | GLB | Carga | Dimensiones Reales (mm) | Origen / Pivot del GLB | Posición Calculada en Escena | Problema Detectado | Causa Probable |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Superficie Perimetral** (`LKSU010010`) | *N/A (Procedural)* | **SÍ** | $W=\text{anchoMm}$, $D=\text{profundidadMm}$, $T=\text{thickMm}$ | Centrado en $(X=0, Z=0)$, base en $Y=0$ | $(0, \text{alturaMm}/1000, 0)$ | Correcto en elevación; componentes bajo ella no coinciden. | La superficie se genera de forma procedural en Three.js; los GLB bajo ella tienen ejes u orígenes desalineados. |
| **Costado Terminal Izq** (`KUSO800000`) | `KUSO800000_IZQ.glb` | **SÍ** | $X=87.4$, $Y=600.0$, $Z=455.9$ | Corner mínimo $[0.0, 0.0, 0.0]$ | $X = -(\text{ancho}/2 - 60)$, $Y=0$, $Z=0$ | La pata aparece acostada/rotada $90^\circ$ y desplazada del eje de profundidad. | El GLB fue exportado desde CET con convención CAD ($Z$-up, $Y$-fondo). Al cargarse en Three.js ($Y$-up), la profundidad ($600\text{ mm}$) queda vertical y el origen está en una esquina del pie en vez del centro. |
| **Costado Terminal Der** (`KUSO800000`) | `KUSO800000_DER.glb` | **SÍ** | $X=87.4$, $Y=600.0$, $Z=455.9$ | Corner mínimo $[-0.011, 0.0, 0.0]$ | $X = +(\text{ancho}/2 - 60)$, $Y=0$, $Z=0$ | Pata acostada/rotada $90^\circ$ y no simétrica respecto al centro de la mesa. | Misma causa: convención de coordenadas CAD $Z$-up y origen no centrado en $Y/Z$. |
| **Viga Soporte** (`KUSO420000`) | `KUSO420000_150.glb` | **SÍ** | $X=1496.0$, $Y=500.0$, $Z=50.0$ | Corner extremo $X=0$, $Y=0$, $Z=0$ | $(0, \text{surfaceY} - 40, 0)$ | La viga sobresale hacia la derecha y no queda centrada bajo la mesa. | El origen del GLB está en el extremo izquierdo ($X=0$), por lo que al ubicarse en $X=0$ se proyecta desde $0$ hasta $+1.496\text{ m}$. |
| **Ducto Cableado** (`KUSO860000`) | `KUSO860000_165.glb` | **SÍ** | $X=1559.0$, $Y=140.0$, $Z=145.9$ | Corner extremo $X=0$, $Y=0$, $Z=0$ | $(0, \text{surfaceY} - 60, 0)$ | El ducto queda desplazado hacia la derecha. | El origen del GLB está en el extremo izquierdo ($X=0$) en lugar del centro longitudinal ($X=0.779\text{ m}$). |
| **Vértebra Metálica** (`KUAC650000`) | `KUAC650000.glb` | **SÍ** | $X=70.0$, $Y=161.3$, $Z=626.6$ | Base $[0.0, 0.0, 0.0]$ | $X = \pm(\text{ancho}/2 - 80)$, $Y=0$, $Z=0$ | No se aprecia verticalmente en la escena. | Su longitud ($626.6\text{ mm}$) está orientada en el eje $Z$ (horizontal/profundidad) en lugar del eje $Y$ (vertical). Queda acostada a ras de piso. |
| **Kit Fuente** (`KUAC1040000`) | `KUAC1040000_74.glb` | **SÍ** | $X=58.8$, $Y=96.5$, $Z=695.0$ | Corner $[-0.004, -0.008, 0.0]$ | $(0, \text{surfaceY} - 20, -250)$ | Orientación no alineada con el plano de la bandeja. | Longitud de $695\text{ mm}$ orientada a lo largo del eje $Z$. |
| **Soporte Tomas** (`KUAC680000`) | `KUAC680000.glb` | **SÍ** | $X=607.0$, $Y=232.2$, $Z=166.0$ | Corner $[0.0, 0.0, 0.0]$ | $(0, \text{surfaceY} - 60, -250)$ | Origen en extremo $X=0$. | Origen no centrado en $X$. |
| **Grommet 4 Tomas** (`LKAC250000`) | `LKAC250000.glb` | **SÍ** | $X=512.0$, $Y=115.5$, $Z=33.6$ | Centro $X\approx 0$, $Y\approx 0.013$ | $(0, \text{surfaceY} + 5, -D/2 + 60)$ | Orientación invertida o plana. | Requiere confirmación de eje de inserción. |
| **Botonera LINAK** (`DPBK06`) | *Sin GLB* | **N/A** | N/A | N/A | N/A | Sin representación 3D (BOM Only). | Componente lógico sin modelo geométrico. |

---

## 2. Diagnóstico del Flujo de Parametrización (Swap de Variantes)

### Análisis de Prueba Comparativa:
- **Configuración Inicial:** $1200\text{ mm} \times 600\text{ mm} \times 730\text{ mm}$, Espesor $30\text{ mm}$.
- **Configuración Modificada:** $1600\text{ mm} \times 800\text{ mm} \times 730\text{ mm}$, Espesor $30\text{ mm}$.

| Parámetro | Valor Inicial | Valor después del Cambio | ¿Se Actualiza en Escena? | Archivo Responsable | Observación del Flujo |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **`anchoMm` (Superficie)** | $1200\text{ mm}$ | $1600\text{ mm}$ | **SÍ** | `surfaceFactory.js` / `createKuoAVInstance.js` | La tapa procedural se redimensiona correctamente a $1.60\text{ m}$. |
| **`profundidadMm` (Superficie)** | $600\text{ mm}$ | $800\text{ mm}$ | **SÍ** | `surfaceFactory.js` / `createKuoAVInstance.js` | La tapa procedural se redimensiona a $0.80\text{ m}$. |
| **Posición Costado Izquierdo** | $X = -540\text{ mm}$ | $X = -740\text{ mm}$ | **SÍ** (en $X$) | `kuoAVBaseRules.js` | Se desplaza hacia el nuevo borde lateral, pero mantiene el desfase por su origen en esquina. |
| **Posición Costado Derecho** | $X = +540\text{ mm}$ | $X = +740\text{ mm}$ | **SÍ** (en $X$) | `kuoAVBaseRules.js` | Se desplaza hacia el nuevo borde lateral, pero mantiene el desfase por su origen en esquina. |
| **Viga Soporte (`KUSO420000`)** | $1496\text{ mm}$ fija | $1496\text{ mm}$ fija | **NO (Fija)** | `KuoAVBuilder.js` | El GLB `KUSO420000_150.glb` tiene longitud fija de $1.496\text{ m}$ (medida 150) y no se adapta al nuevo ancho. |
| **Ducto Cableado (`KUSO860000`)** | $1559\text{ mm}$ fijo | $1559\text{ mm}$ fijo | **NO (Fijo)** | `KuoAVBuilder.js` | El GLB `KUSO860000_165.glb` tiene longitud fija de $1.559\text{ m}$ y no se adapta al nuevo ancho. |
| **Posición Grommet (`Z`)** | $Z = -240\text{ mm}$ | $Z = -340\text{ mm}$ | **SÍ** | `kuoAVAccessoryRules.js` | Se recalcula $Z = -\text{profundidad}/2 + 60\text{ mm}$, siguiendo el borde posterior. |
| **Persistencia en `userData.config`** | $1200\times 600$ | $1600\times 800$ | **SÍ** | `ThreeCanvas.jsx` (`swapKuoAVVariant`) | La configuración se conserva íntegramente en `userData.config`. |

---

## 3. Conclusiones del Diagnóstico

1. **Discrepancia de Ejes de Exportación CET ($Z$-up vs $Y$-up):**
   - Los modelos exportados desde CET (`KUSO800000`, `KUAC650000`, `KUAC1040000`) tienen la altura en el eje $Z$ y el fondo en el eje $Y$, lo que provoca que en Three.js se vean acostados o invertidos.
2. **Pivots y Orígenes Descentrados:**
   - La viga `KUSO420000_150.glb`, el ducto `KUSO860000_165.glb` y las columnas `KUSO800000` tienen su origen $(0,0,0)$ en una esquina extrema en lugar del centro geométrico. Al posicionarse en $X=0$, se desplazan unilateralmente.
3. **Componentes Fijos vs Paramétricos:**
   - La superficie y las posiciones relativas responden adecuadamente a `swapKuoAVVariant()`, pero la viga y el ducto corresponden a medidas fijas nominales ($150$ y $165$) que no crecen ni decrecen con anchos de $1200$ o $1400\text{ mm}$.
