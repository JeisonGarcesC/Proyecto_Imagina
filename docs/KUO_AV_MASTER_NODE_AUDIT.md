# Auditoría y Extracción de Nodos del Modelo Maestro CET: `KuoGo_prueba_01.glb`

---

## 1. Diagnóstico General del GLB Maestro

Se realizó la extracción y el análisis estructural exhaustivo del archivo maestro exportado desde CET:
**`c:/Users/fermalhe/OneDrive - Carvajal S.A/Documentos 2021/Escritorio/Kuo Altura Variable/KuoGo_prueba_01.glb`** ($8,149,360\text{ bytes}$).

### Resultados Globales:
- **Nodos totales:** $100$ nodos.
- **Mallas totales:** $46$ mallas.
- **Materiales:** $2$ materiales principales (`Material 1` opaco y `transparencyGM` con canal alfa BLEND).
- **Dimensiones globales del ensamble:**
  - Ancho total ($X$): $1200.0\text{ mm}$ (de $X=-1.5264\text{ m}$ a $X=-0.3264\text{ m}$, centro en $X=-0.9264\text{ m}$).
  - Fondo total ($Z$): $619.9\text{ mm}$ (de $Z=0.3846\text{ m}$ a $Z=1.0045\text{ m}$, centro en $Z=0.6869\text{ m}$).
  - Altura total ($Y$): $745.5\text{ mm}$ (de $Y=0.0000\text{ m}$ en piso a $Y=0.7455\text{ m}$ en cara superior de la superficie).

> [!IMPORTANT]
> El GLB maestro contiene físicamente dentro de su jerarquía **todos los componentes del ensamble real de CET**, incluyendo la vértebra pasacables, ambas patas con motores, la viga telescópica, el ducto pasacables, el soporte de tomas, el grommet y la botonera LINAK.

---

## 2. Jerarquía de Nodos y Transformaciones del Modelo Maestro

El nodo raíz `Node [0] ("root")` tiene la matriz de conversión CAD $R_x(+90^\circ)$, y su hijo `Node [2] ("93fcdc4a-52a2-4d4b-8599-c3da20237ed4")` agrupa los **9 sub-ensambles funcionales** de la mesa:

| Componente | Código CET | Nodo Raíz del Sub-ensamble | Parent | Mallas Hijas | Dimensiones en Escena ($X, Y, Z$) | Posición Local del Nodo | Posición Mundial Centro ($X,Y,Z$) | Identificación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Superficie Perimetral** | `LKSU010010` | Node `[12]` | Node `[2]` | Meshes `[4, 5, 6, 7, 8, 9, 10, 11, 12, 13]` | $1200.0 \times 31.4 \times 600.0\text{ mm}$ | `[0, 0, 0.714]` | `[-0.9264, 0.7297, 0.6869]` | **Confirmada** |
| **Costado Izquierdo** | `KUSO800000` | Node `[64]` | Node `[2]` | Meshes `[30, 31, 32, 33, 34, 35, 36, 37]` | $76.0 \times 710.0 \times 600.0\text{ mm}$ | `[0, -0.300, 0]` | `[-1.4884, 0.3550, 0.6869]` | **Confirmada** |
| **Costado Derecho** | `KUSO800000` | Node `[82]` | Node `[2]` | Meshes `[38, 39, 40, 41, 42, 43, 44, 45]` | $76.0 \times 710.0 \times 600.0\text{ mm}$ | `[1.200, -0.300, 0]` | `[-0.3644, 0.3550, 0.6869]` | **Confirmada** |
| **Viga Soporte** | `KUSO420000` | Node `[42]` | Node `[2]` | Meshes `[20, 21, 22, 23, 24, 25]` | $1200.0 \times 51.0 \times 500.0\text{ mm}$ | `[0.600, -0.300, 0]` | `[-0.9264, 0.6845, 0.6869]` | **Confirmada** |
| **Ducto Cableado** | `KUSO860000` | Node `[3]` | Node `[2]` | Meshes `[0, 1]` | $1109.0 \times 145.9 \times 140.0\text{ mm}$ | `[0.045, -0.151, 0.303]` | `[-0.9269, 0.3760, 0.4679]` | **Confirmada** |
| **Vértebra Pasacables** | `KUAC650000` | Node `[7]` | Node `[2]` | Meshes `[2, 3]` ($23,437$ vértices) | $70.0 \times 626.6 \times 161.3\text{ mm}$ | `[0, 0, 0]` | `[-0.9264, 0.3384, 0.5175]` | **Confirmada** |
| **Soporte Tomas** | `KUAC680000` | Node `[37]` | Node `[2]` | Meshes `[18, 19]` ($6,813$ vértices) | $607.0 \times 166.0 \times 232.3\text{ mm}$ | `[0.296, -0.230, 0.572]` | `[-0.9264, 0.6550, 0.5007]` | **Confirmada** |
| **Grommet 4 Tomas** | `LKAC250000` | Node `[28]` | Node `[2]` | Meshes `[14, 15, 16, 17]` | $512.0 \times 33.5 \times 115.6\text{ mm}$ | `[0.600, -0.071, 0.744]` | `[-0.9262, 0.7288, 0.4446]` | **Confirmada** |
| **Botonera LINAK** | `DPBK06` | Node `[55]` | Node `[2]` | Meshes `[26, 27, 28, 29]` | $60.0 \times 15.8 \times 87.1\text{ mm}$ | `[1.080, -0.620, 0.698]` | `[-0.4164, 0.7066, 0.9609]` | **Confirmada** |
| **Kit Fuente (Columna)** | `KUAC1040000` | Nodes `[79]` y `[97]` | Nodes `[78]`/`[96]` | Meshes `[36, 37]` y `[44, 45]` | $58.7 \times 695.0 \times 96.5\text{ mm}$ | `[0, 0, 0]` | `[-1.5064, 0.0150, 0.7279]` | **Confirmada** |

---

## 3. MASTER → GLB INDIVIDUALES (Correspondencia Exacta de Mallas)

| Archivo GLB Individual | Código CET | Nodo en GLB Master | Malla Asociada en Master | Vértices | Correspondencia Geométrica | Observaciones de Extracción |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **`KUAC650000.glb`** | `KUAC650000` | Node `[10]` / `[11]` | Mesh `[2]`, `[3]` | $23,437$ | **100% IDÉNTICA** | Malla y vértices exactamente iguales a la vértebra del modelo maestro. |
| **`KUSO800000_IZQ.glb`** | `KUSO800000` | Node `[64]` | Meshes `[30, 32, 34]` | $6,153$ | **100% IDÉNTICA** | Pie izquierdo en $X=-1.488\text{m}$, base en $Y=0$, $Z=600\text{mm}$. |
| **`KUSO800000_DER.glb`** | `KUSO800000` | Node `[82]` | Meshes `[38, 40, 42]` | $6,275$ | **100% IDÉNTICA** | Pie derecho en $X=-0.364\text{m}$, base en $Y=0$, $Z=600\text{mm}$. |
| **`KUAC680000.glb`** | `KUAC680000` | Node `[40]` / `[41]` | Mesh `[18]`, `[19]` | $6,813$ | **100% IDÉNTICA** | Bandeja de tomas bajo tapa en $Y=0.655\text{m}$, $Z=0.500\text{m}$. |
| **`LKAC250000.glb`** | `LKAC250000` | Node `[35]` / `[36]` | Mesh `[16]`, `[17]` | $15,388$ | **100% IDÉNTICA** | Grommet de 4 tomas sobre la superficie posterior. |
| **`KUAC1040000_74.glb`** | `KUAC1040000` | Node `[80]` / `[98]` | Meshes `[36]`, `[44]` | $5,684$ | **100% IDÉNTICA** | Fuente/cableado integrado dentro de cada columna. |
| **`KUSO420000_150.glb`** | `KUSO420000` | Node `[42]` | Meshes `[20, 22, 24]` | $3,710$ | **VARIANTE NOMINAL** | El master de 1200 usa viga de $1200\text{mm}$, mientras el individual exportado es la medida 150 ($1496\text{mm}$). |
| **`KUSO860000_165.glb`** | `KUSO860000` | Node `[3]` | Meshes `[0, 1]` | $5,661$ | **VARIANTE NOMINAL** | El master de 1200 usa ducto de $1109\text{mm}$, mientras el individual exportado es la medida 165 ($1559\text{mm}$). |

---

## 4. Conclusiones y Parámetros Extraídos para la Calibración:

1. **Ubicación de la Botonera LINAK (`DPBK06`):**
   - El GLB maestro sí contiene la geometría física de la botonera (`Node [55]`, dimensiones $60\times 15.8\times 87.1\text{ mm}$) ubicada en la esquina frontal derecha bajo la tapa en $X = -0.4164\text{ m}$, $Y = 0.7066\text{ m}$, $Z = 0.9609\text{ m}$.
2. **Posicionamiento Real de los Pies de Apoyo:**
   - En la mesa patrón de $1200\text{ mm}$, los centros de las columnas están a $X = -1.4884\text{ m}$ (izq) y $X = -0.3644\text{ m}$ (der), con una distancia entre centros de exactamente $1124.0\text{ mm}$ (inset lateral de $38.0\text{ mm}$ respecto al borde exterior de la tapa).
3. **Elevación de la Superficie:**
   - La cara superior de la superficie perimetral está en $Y = 745.5\text{ mm}$ (altura de trabajo estándar) y la cara inferior en $Y = 714.0\text{ mm}$ ($31.5\text{ mm}$ de espesor nominal).
