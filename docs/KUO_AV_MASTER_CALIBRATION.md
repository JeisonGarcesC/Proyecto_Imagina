# Calibración Matemática Canónica: Master CET → IMAGINA (KUO AV)

---

## 1. Fundamento Matemático y Sistemas de Coordenadas

A partir de la extracción directa de la estructura de nodos de **`KuoGo_prueba_01.glb`** ($1200\times 600\text{ mm}$), se determinó con precisión milimétrica la relación espacial entre el sistema de exportación de CET y el sistema canónico de IMAGINA.

### A. Sistema de Coordenadas Master CET:
- **Centro geométrico de la mesa en $X$:** $X_{\text{master}} = -0.9264\text{ m}$ ($-926.4\text{ mm}$)
- **Nivel de piso en $Y$:** $Y_{\text{master}} = 0.0000\text{ m}$ ($0.0\text{ mm}$)
- **Centro geométrico de fondo en $Z$:** $Z_{\text{master}} = +0.6869\text{ m}$ ($+686.9\text{ mm}$)
- **Cota superior de superficie:** $Y = 0.7455\text{ m}$ ($745.5\text{ mm}$)
- **Cota inferior de superficie:** $Y = 0.7140\text{ m}$ ($714.0\text{ mm}$, espesor $31.4\text{ mm}$)

### B. Sistema de Coordenadas Canónico IMAGINA:
- **Centro de la mesa:** $X_{\text{imagina}} = 0.0\text{ mm}$, $Z_{\text{imagina}} = 0.0\text{ mm}$
- **Nivel de piso:** $Y_{\text{imagina}} = 0.0\text{ mm}$
- **Orientación:** Frente del usuario hacia $+Z$, Posterior hacia $-Z$, Lateral derecho $+X$, Lateral izquierdo $-X$.

### C. Vector de Traslación Rígida ($\Delta X, \Delta Y, \Delta Z$):
$$\Delta X = +926.4\text{ mm}$$
$$\Delta Y = 0.0\text{ mm}$$
$$\Delta Z = -686.9\text{ mm}$$

$$\begin{pmatrix} X_{\text{imagina}} \\ Y_{\text{imagina}} \\ Z_{\text{imagina}} \end{pmatrix} = \begin{pmatrix} X_{\text{master}} + 926.4 \\ Y_{\text{master}} \\ Z_{\text{master}} - 686.9 \end{pmatrix}$$

---

## 2. Matriz de Componentes y Posiciones Calibradas (Mesa $1200\times 600\text{ mm}$)

| Componente | Código CET | Archivo GLB | Nodo Master | Posición Master World ($X, Y, Z$) | Posición IMAGINA Canónica ($X, Y, Z$) | Dimensiones ($W \times H \times D$) | Correspondencia |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **Superficie** | `LKSU010010` | *Procedural* | Node `[12]` | `[-926.4, 729.7, 686.9]` | `[0.0, 729.7, 0.0] mm` | $1200.0 \times 31.4 \times 600.0\text{ mm}$ | **Confirmada 100%** |
| **Costado Izquierdo** | `KUSO800000` | `KUSO800000_IZQ.glb` | Node `[64]` | `[-1488.4, 355.0, 686.9]` | `[-562.0, 355.0, 0.0] mm` | $76.0 \times 710.0 \times 600.0\text{ mm}$ | **Confirmada 100%** |
| **Costado Derecho** | `KUSO800000` | `KUSO800000_DER.glb` | Node `[82]` | `[-364.4, 355.0, 686.9]` | `[+562.0, 355.0, 0.0] mm` | $76.0 \times 710.0 \times 600.0\text{ mm}$ | **Confirmada 100%** |
| **Viga Soporte** | `KUSO420000` | `KUSO420000_150.glb` | Node `[42]` | `[-926.4, 684.5, 686.9]` | `[0.0, 684.5, 0.0] mm` | $1200.0 \times 51.0 \times 500.0\text{ mm}$ | **Variante Nominal ($1200$ vs $1496$)** |
| **Ducto Cableado** | `KUSO860000` | `KUSO860000_165.glb` | Node `[3]` | `[-926.9, 376.0, 467.9]` | `[-0.5, 376.0, -219.0] mm` | $1109.0 \times 145.9 \times 140.0\text{ mm}$ | **Variante Nominal ($1109$ vs $1559$)** |
| **Vértebra** | `KUAC650000` | `KUAC650000.glb` | Node `[7]` | `[-926.4, 338.4, 517.5]` | `[0.0, 338.4, -169.4] mm` | $70.0 \times 626.6 \times 161.3\text{ mm}$ | **Confirmada 100%** |
| **Soporte Tomas** | `KUAC680000` | `KUAC680000.glb` | Node `[37]` | `[-926.4, 655.0, 500.7]` | `[0.0, 655.0, -186.2] mm` | $607.0 \times 166.0 \times 232.3\text{ mm}$ | **Confirmada 100%** |
| **Grommet 4 Tomas** | `LKAC250000` | `LKAC250000.glb` | Node `[28]` | `[-926.2, 728.8, 444.6]` | `[+0.2, 728.8, -242.3] mm` | $512.0 \times 33.5 \times 115.6\text{ mm}$ | **Confirmada 100%** |
| **Botonera LINAK** | `DPBK06` | *Geometría en Master* | Node `[55]` | `[-416.4, 706.6, 960.9]` | `[+510.0, 706.6, +274.0] mm` | $60.0 \times 15.8 \times 87.1\text{ mm}$ | **Confirmada en Master** |
| **Kit Fuente (Columna)** | `KUAC1040000` | `KUAC1040000_74.glb` | Node `[79, 97]` | `[-1506.4, 15.0, 727.9]` | `[-580.0, 15.0, +41.0] mm` | $58.7 \times 695.0 \times 96.5\text{ mm}$ | **Confirmada 100%** |

---

## 3. Análisis de Insets y Relaciones Paramétricas Confirmadas

1. **Costados / Patas (`KUSO800000`):**
   - El ancho total de la mesa es de $1200.0\text{ mm}$ (bordes en $X = \pm 600.0\text{ mm}$).
   - Los centros de las columnas se ubican exactamente en $X = \pm 562.0\text{ mm}$.
   - **Inset lateral real:** $600.0 - 562.0 = \mathbf{38.0\text{ mm}}$ desde el borde exterior.
   - En el eje $Z$, los pies están exactamente centrados en $Z = 0.0\text{ mm}$ (coincidiendo con el fondo de $600\text{ mm}$).

2. **Grommet 4 Tomas (`LKAC250000`):**
   - Centrado en $X = 0.0\text{ mm}$.
   - Su centro en $Z$ está en $Z = -242.3\text{ mm}$. Como el borde posterior de la mesa está en $Z = -300.0\text{ mm}$, el inset desde el borde posterior es de $\mathbf{57.7\text{ mm}}$.

3. **Botonera LINAK (`DPBK06`):**
   - Su centro está en $X = +510.0\text{ mm}$ (a $90.0\text{ mm}$ del borde derecho $X = +600.0$).
   - Su centro en $Z$ está en $Z = +274.0\text{ mm}$ (a $26.0\text{ mm}$ del borde frontal $Z = +300.0$).
   - En $Y$, está anclada a la cara inferior de la tapa en $Y = 706.6\text{ mm}$.

4. **Ducto Cableado (`KUSO860000`) y Soporte Tomas (`KUAC680000`):**
   - El soporte de tomas está en $Z = -186.2\text{ mm}$.
   - El ducto pasacables cuelga bajo la viga en $Z = -219.0\text{ mm}$, $Y = 376.0\text{ mm}$.
