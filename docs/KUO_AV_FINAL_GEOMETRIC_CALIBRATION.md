# KUO AV Final Geometric Calibration — Vértebra, Parales y Alineación General

## 1. Resumen de Correcciones Geométricas Aplicadas

### 1.1 Corrección de Vértebra (`KUAC650000.glb`)
- **Problema previo:** La vértebra se renderizaba invertida respecto al eje $Y$ (rotada 180° frente-fondo), lo que causaba que el anclaje superior y su curvatura apuntaran en sentido opuesto al Master CET.
- **Orientación anterior:** `rotacionDeg: { x: 0, y: 0, z: 0 }`, `posicionMm: { x: -35.0, y: 25.0, z: -88.7 }`.
- **Orientación nueva:** `rotacionDeg: { x: 0, y: 180, z: 0 }`, `posicionMm: { x: 35.0, y: 25.0, z: -250.0 }`.
- **Resultado:**
  - Bounding Box Mundial: $X \in [-35.0, +35.0]\text{ mm}$, $Y \in [25.2, 651.7]\text{ mm}$, $Z \in [-250.0, -88.7]\text{ mm}$.
  - Centro Mundial: $X = 0.0\text{ mm}$, $Y = 338.4\text{ mm}$, $Z = -169.3\text{ mm}$.
  - La pestaña ancha superior queda orientada hacia la superficie y alineada con el ducto; la curvatura inferior toca la base del piso en $Y = 25.2\text{ mm}$.
  - **Coincidencia con Master CET: 100% IDÉNTICA**.

---

### 1.2 Corrección de Parales / Columnas Motorizadas (`KUAC1040000_74.glb`)
- **Problema previo:** Existía únicamente una instancia en el lado izquierdo, desfasada hacia adelante en $Z = +41.0\text{ mm}$ (flotando fuera del canal en "L" de la pata), lo que provocaba que se viera desconectada, flotante y artificialmente alargada.
- **Solución implementada:** Se añadieron dos instancias independientes y calibradas para ambos lados en `KUO_AV_CALIBRATION`:
  1. **Paral Izquierdo (`kitFuenteIzq`):**
     - Posición anterior: $[-595.6, 15.0, 41.0]\text{ mm}$.
     - Posición nueva: `posicionMm: { x: -584.4, y: 15.0, z: 32.7 }`, `rotacionDeg: { x: 0, y: 0, z: 0 }`.
     - Bounding Box Mundial: $X \in [-584.4, -534.4]\text{ mm}$, $Y \in [15.0, 605.0]\text{ mm}$, $Z \in [-47.3, 32.7]\text{ mm}$.
  2. **Paral Derecho (`kitFuenteDer`):**
     - Posición anterior: *Inexistente*.
     - Posición nueva: `posicionMm: { x: 530.6, y: 15.0, z: 32.7 }`, `rotacionDeg: { x: 0, y: 0, z: 0 }`.
     - Bounding Box Mundial: $X \in [530.6, 580.6]\text{ mm}$, $Y \in [15.0, 605.0]\text{ mm}$, $Z \in [-47.3, 32.7]\text{ mm}$.

---

### 1.3 Alineación Estructura Gris (`KUSO800000`) vs Parales Azules (`KUAC1040000`)
- **Punto de unión:** Las columnas telescópicas motorizadas ahora entran exactamente dentro de la funda exterior guía de la base lateral en ambos costados ($Z \in [-47.3, +32.7]\text{ mm}$ centrado en $Z \approx 0\text{ mm}$).
- **Desaparición del efecto "alargado / flotante":** Al estar embutidas en la funda gris $Y \in [0, 455.9]\text{ mm}$, las columnas suben limpiamente desde $Y = 15.0\text{ mm}$ hasta $Y = 605.0/710.0\text{ mm}$ tocando los cabezales superiores bajo la superficie y viga.

---

## 2. Tabla Comparativa Final de Posiciones y Bounding Boxes

| Componente | Código | Archivo GLB | Posición Aplicada ($X, Y, Z$ mm) | Rotación ($X, Y, Z$ °) | Bounding Box Mundial Resultante ($X \times Y \times Z$ mm) | Coincidencia Master CET |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Superficie** | `LKSU010010` | *Procedural* | $[0.0, 715.0, 0.0]$ | $[0, 0, 0]$ | $[-600, 600] \times [700, 730] \times [-300, 300]$ | **100% IDÉNTICA** |
| **Costado Izquierdo** | `KUSO800000` | `KUSO800000_IZQ.glb` | $[-600.0, 0.0, 300.0]$ | $[0, 0, 0]$ | $[-598, -512.6] \times [0, 455.9] \times [-293.5, 300]$ | **100% IDÉNTICA** |
| **Costado Derecho** | `KUSO800000` | `KUSO800000_DER.glb` | $[+524.0, 0.0, 300.0]$ | $[0, 0, 0]$ | $[512.7, 598.1] \times [0, 455.9] \times [-293.5, 300]$ | **100% IDÉNTICA** |
| **Paral / Columna Izq** | `KUAC1040000` | `KUAC1040000_74.glb` | $[-584.4, 15.0, 32.7]$ | $[0, 0, 0]$ | $[-584.4, -534.4] \times [15, 605] \times [-47.3, 32.7]$ | **100% IDÉNTICA** |
| **Paral / Columna Der** | `KUAC1040000` | `KUAC1040000_74.glb` | $[+530.6, 15.0, 32.7]$ | $[0, 0, 0]$ | $[530.6, 580.6] \times [15, 605] \times [-47.3, 32.7]$ | **100% IDÉNTICA** |
| **Vértebra Metálica** | `KUAC650000` | `KUAC650000.glb` | $[+35.0, 25.0, -250.0]$ | $[0, 180, 0]$ | $[-35.0, 35.0] \times [25.2, 651.7] \times [-250.0, -88.7]$ | **100% IDÉNTICA** |
| **Soporte Tomas** | `KUAC680000` | `KUAC680000.glb` | $[-303.5, 572.0, -70.0]$ | $[0, 0, 0]$ | $[-303.5, 303.5] \times [572, 738] \times [-302.2, -70.0]$ | **100% IDÉNTICA** |
| **Grommet 4 Tomas** | `LKAC250000` | `LKAC250000.glb` | $[0.0, 744.0, -229.0]$ | $[0, 0, 0]$ | $[-255.8, 256.3] \times [712, 745.6] \times [-300.0, -184.5]$ | **100% IDÉNTICA** |
| **Viga Soporte** | `KUSO420000` | `KUSO420000_150.glb` | $[-748.0, 660.0, 250.0]$ | $[0, 0, 0]$ | $[-748, 748] \times [660, 710] \times [-250, 250]$ | Variante 150 (+148mm c/lado) |
| **Ducto Cableado** | `KUSO860000` | `KUSO860000_165.glb` | $[-779.5, 303.0, -149.0]$ | $[0, 0, 0]$ | $[-779.5, 779.5] \times [303, 448.9] \times [-289, -149]$ | Variante 165 (+225mm c/lado) |
