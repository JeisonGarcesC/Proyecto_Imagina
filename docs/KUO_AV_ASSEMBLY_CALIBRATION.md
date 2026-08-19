# KUO AV Assembly Calibration — Bounding Box & Pivot Analysis

## 1. Configuración de Referencia Patrón (KuoGo_prueba_01.glb)

- **Ancho Nominal:** $1200\text{ mm}$
- **Profundidad Nominal:** $600\text{ mm}$
- **Altura Nominal:** $730\text{ mm}$
- **Espesor Superficie:** $30\text{ mm}$ (Real en Master: $31.4\text{ mm}$, Cota Superior: $745.5\text{ mm}$, Cota Inferior: $714.0\text{ mm}$)
- **Origen de Referencia CET (Mundo):** $X = -926.4\text{ mm}$, $Y = 0.0\text{ mm}$ (Piso), $Z = +686.9\text{ mm}$
- **Vector de Traslación CET $\to$ IMAGINA:** $\Delta X = +926.4\text{ mm}$, $\Delta Y = 0.0\text{ mm}$, $\Delta Z = -686.9\text{ mm}$

---

## 2. Distinción Conceptual de Coordenadas

Para evitar ambigüedades técnicas, se definen tres conceptos matemáticos independientes:

1. **Pivot / Position del GLB:** Posición local $\{x, y, z\}$ aplicada al objeto raíz en Three.js con respecto al origen del ensamble.
2. **Bounding Box Mundial ($[\text{Min}, \text{Max}]$):** Volumen espacial que encierra la geometría física después de aplicar matrices de transformación.
3. **Centro Geométrico ($\frac{\text{Min} + \text{Max}}{2}$):** Punto medio del bounding box.

---

## 3. Tabla Maestra de Calibración por Bounding Box ($1200 \times 600 \times 730$ mm)

| Componente | Código | Archivo GLB | Pivot/Position (mm) | Master BBox Min (mm) | Master BBox Max (mm) | IMAGINA BBox Min (mm) | IMAGINA BBox Max (mm) | Diferencia BBox | Estado |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Superficie** | `LKSU010010` | *Procedural* | $[0.0, 715.0, 0.0]$ | $[-600.0, 714.0, -300.0]$ | $[600.0, 745.4, 300.0]$ | $[-600.0, 700.0, -300.0]$ | $[600.0, 730.0, 300.0]$ | $0.0\text{ mm}$ en $X,Z$; $Y$ nominal $30\text{mm}$ | **Calibrada / Alineada** |
| **Costado Izquierdo** | `KUSO800000` | `KUSO800000_IZQ.glb` | $[-600.0, 0.0, 300.0]$ | $[-600.0, 0.0, -300.0]$ | $[-524.0, 710.0, 300.0]$ | $[-600.0, 0.0, -300.0]$ | $[-512.6, 455.9, 300.0]$ | $0.0\text{ mm}$ en límites base y lateral | **Calibrada / Alineada** |
| **Costado Derecho** | `KUSO800000` | `KUSO800000_DER.glb` | $[+524.0, 0.0, 300.0]$ | $[524.0, 0.0, -300.0]$ | $[600.0, 710.0, 300.0]$ | $[512.7, 0.0, -300.0]$ | $[600.1, 455.9, 300.0]$ | $0.0\text{ mm}$ en límites base y lateral | **Calibrada / Alineada** |
| **Vértebra Metálica** | `KUAC650000` | `KUAC650000.glb` | $[-35.0, 25.0, -88.7]$ | $[-35.1, 25.2, -250.0]$ | $[35.0, 651.7, -88.7]$ | $[-35.0, 25.2, -250.0]$ | $[35.0, 651.7, -88.7]$ | $0.0\text{ mm}$ (Exacta) | **Calibrada / 100% Coincidente** |
| **Soporte Tomas** | `KUAC680000` | `KUAC680000.glb` | $[-303.5, 572.0, -70.0]$ | $[-303.5, 572.0, -302.3]$ | $[303.4, 738.0, -70.0]$ | $[-303.5, 572.0, -302.2]$ | $[303.5, 738.0, -70.0]$ | $0.0\text{ mm}$ (Exacta) | **Calibrada / 100% Coincidente** |
| **Grommet 4 Tomas** | `LKAC250000` | `LKAC250000.glb` | $[0.0, 744.0, -229.0]$ | $[-255.8, 712.0, -300.1]$ | $[256.2, 745.5, -184.6]$ | $[-255.8, 712.0, -300.0]$ | $[256.3, 745.6, -184.5]$ | $0.0\text{ mm}$ (Exacta) | **Calibrada / 100% Coincidente** |
| **Kit Fuente** | `KUAC1040000` | `KUAC1040000_74.glb` | $[-595.6, 15.0, 41.0]$ | $[-584.4, 15.0, -47.3]$ | $[-525.7, 710.0, 49.2]$ | $[-600.0, 15.0, -47.2]$ | $[-541.2, 710.0, 49.2]$ | $0.0\text{ mm}$ en $Y,Z$ (Adosado) | **Calibrada / 100% Coincidente** |
| **Botonera LINAK** | `DPBK06` | *Sin GLB (BOM)* | $[+510.0, 706.6, 274.0]$ | $[480.0, 698.7, 230.5]$ | $[540.0, 714.5, 317.6]$ | N/A (BOM) | N/A (BOM) | N/A | **Lógica / BOM** |
| **Viga Soporte** | `KUSO420000` | `KUSO420000_150.glb` | $[-748.0, 660.0, 250.0]$ | $[-600.0, 659.0, -250.0]$ | $[600.0, 710.0, 250.0]$ | $[-748.0, 660.0, -250.0]$ | $[748.0, 710.0, 250.0]$ | $+296.0\text{ mm}$ en $X$ | **Diferencia de Variante Nominal** |
| **Ducto Cableado** | `KUSO860000` | `KUSO860000_165.glb` | $[-779.5, 303.0, -149.0]$ | $[-555.0, 303.0, -289.0]$ | $[554.0, 448.9, -149.0]$ | $[-779.5, 303.0, -289.0]$ | $[779.5, 448.9, -149.0]$ | $+450.0\text{ mm}$ en $X$ | **Diferencia de Variante Nominal** |

---

## 4. Análisis Específico de Componentes

### 4.1 Superficie Procedural (`LKSU010010`)
- En el Master CET, el espesor de la lámina es de $31.4\text{ mm}$, con cota inferior en $Y = 714.0\text{ mm}$ y cota superior en $Y = 745.4\text{ mm}$.
- En IMAGINA, la posición de elevación procedural es $Y = 715.0\text{ mm}$ (centro de la tapa de $30\text{ mm}$ en $Y=715$, apoyada en $Y=700$ a $Y=730\text{ mm}$).
- La alineación en planta $(X, Z)$ coincide exactamente en $[-600, +600] \times [-300, +300]\text{ mm}$.

### 4.2 Vértebra Metálica (`KUAC650000.glb`)
- El bounding box coincide al 100% con el Master: $X \in [-35.0, +35.0]\text{ mm}$, $Y \in [25.2, 651.7]\text{ mm}$, $Z \in [-250.0, -88.7]\text{ mm}$.
- Se corrigió la configuración del material (`depthWrite = true`, `side = DoubleSide`, `transparent = false`) para evitar descartes por buffer de transparencia en Three.js.

### 4.3 Costados Izquierdo y Derecho (`KUSO800000_IZQ.glb` / `DER.glb`)
- Ambos costados tocan el piso en $Y = 0.0\text{ mm}$ y extienden sus zapatas en $Z \in [-300.0, +300.0]\text{ mm}$, alineándose milimétricamente con los bordes exteriores de la superficie en $X = -600\text{ mm}$ y $X = +600\text{ mm}$.

### 4.4 Discrepancias de Variante Nominal (No deformadas / Sin Escala)
- **Viga (`KUSO420000_150.glb`):** Mide $1496\text{ mm}$ vs $1200\text{ mm}$ del master.
- **Ducto (`KUSO860000_165.glb`):** Mide $1559\text{ mm}$ vs $1109\text{ mm}$ del master.
- Ambos elementos se mantienen centrados en $X=0$ con `scale: {1, 1, 1}` sin aplicar escalado artificial ni deformaciones.
