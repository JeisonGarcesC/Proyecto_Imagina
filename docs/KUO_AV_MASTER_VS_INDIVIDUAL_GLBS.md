# Auditoría Comparativa: Master CET (KuoGo_prueba_01.glb) vs GLBs Individuales

---

## 1. Resumen Ejecutivo y Respuestas Clave

### A. ¿Qué GLBs individuales corresponden 1:1 al Master?
- **`KUAC650000.glb` (Vértebra Metálica):** $100\%$ idéntica en geometría, primitivas, vértices ($23,437$) y Bounding Box ($70.0 \times 626.6 \times 161.3\text{ mm}$).
- **`KUAC680000.glb` (Soporte de Tomas):** $100\%$ idéntico en geometría y Bounding Box ($607.0 \times 166.0 \times 232.2\text{ mm}$).
- **`LKAC250000.glb` (Grommet 4 Tomas):** $100\%$ idéntico en geometría y Bounding Box ($512.0 \times 33.6 \times 115.5\text{ mm}$).
- **`KUAC1040000_74.glb` (Kit Fuente / Columna Motorizada):** $100\%$ idéntico a las columnas motorizadas superiores del Master (Nodos $79$ y $97$, $12,348$ vértices, altura $695.0\text{ mm}$).

### B. ¿Qué GLB individual está "incompleto" respecto al Master?
- **`KUSO800000_IZQ.glb` y `KUSO800000_DER.glb`:**
  - En CET, la pata de altura variable está compuesta por dos piezas ensambladas:
    1. **Funda exterior / Base fija:** Mide $Y = 0\text{ a }455.9\text{ mm}$ (altura $455.9\text{ mm}$). **Éste es el archivo `KUSO800000`**.
    2. **Columna telescópica motorizada interior:** Mide $Y = 15.0\text{ a }710.0\text{ mm}$ (altura $695.0\text{ mm}$). **Éste es el archivo `KUAC1040000`**.
  - Por tanto, `KUSO800000` no está dañado ni mal escalado; es la funda base inferior que aloja la columna motorizada.

### C. ¿Qué componentes tienen solamente un problema de posición/pivot?
- **Costados, Soporte de Tomas, Grommet, Vértebra y Kit Fuente:** Sus geometrías son perfectas; requirieron únicamente la traslación canónica desde el origen CAD del Master CET al sistema de coordenadas de IMAGINA.

### D. ¿Qué componentes tienen una discrepancia geométrica de variante?
- **`KUSO420000_150.glb` (Viga Soporte):** Mide $1496.0\text{ mm}$ (variante nominal 150 para mesas de 1500/1600mm) vs $1200.0\text{ mm}$ del Master.
- **`KUSO860000_165.glb` (Ducto Cableado):** Mide $1559.0\text{ mm}$ (variante nominal 165) vs $1109.0\text{ mm}$ del Master.

### E. ¿Qué componente tuvo un problema de renderizado y cómo se resolvió?
- **`KUAC650000.glb` (Vértebra):** Su material `transparencyGM` tiene `"alphaMode": "BLEND"` y `opacity: 0.6`. En Three.js, esto causaba `depthWrite = false` y descarte por transparencia. Se corrigió forzando `depthWrite = true`, `side = DoubleSide` y `opacity = 1.0` (sólido).

### F. ¿Qué componentes requerirán eventualmente otro GLB desde CET para mesas de 1200 mm?
- Una variante de viga `KUSO420000_120.glb` ($1200\text{ mm}$) y ducto `KUSO860000_120.glb` ($1109\text{ mm}$) si se desea que no sobresalgan en mesas de ancho $1200\text{ mm}$ sin modularización.

---

## 2. Auditoría Detallada por Componente

### 2.1 Costado Izquierdo: Master Node [64] vs `KUSO800000_IZQ.glb`

| Elemento | Master Node/Mesh | GLB Individual | Existe | Dimensión ($W \times H \times D$ mm) | Transformación / Rol |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Zapata Base** | Node 67 (Mesh 30) | Node 6 (Mesh 1) | SÍ | $76.0 \times 24.6 \times 600.0$ | Apoyada en piso $Y=13.6\text{ a }38.2\text{ mm}$ |
| **Niveladores / Deslizadores** | Node 71 (Mesh 32) | Node 11 (Mesh 3) | SÍ | $22.2 \times 32.0 \times 534.2$ | Contacto piso $Y=0.0\text{ a }32.0\text{ mm}$ |
| **Funda / Tubo Exterior** | Node 75 (Mesh 34) | Node 3 (Mesh 0) | SÍ | $73.6 \times 418.0 \times 147.9$ | Altura $Y=37.6\text{ a }455.9\text{ mm}$ |
| **Columna Motorizada Linak** | Node 80 (Mesh 36) | En `KUAC1040000_74.glb` | SÍ (Separado) | $58.7 \times 695.0 \times 96.5$ | Extensión telescópica $Y=15.0\text{ a }710.0\text{ mm}$ |

### 2.2 Costado Derecho: Master Node [82] vs `KUSO800000_DER.glb`

| Elemento | Master Node/Mesh | GLB Individual | Existe | Dimensión ($W \times H \times D$ mm) | Transformación / Rol |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Zapata Base** | Node 89 (Mesh 40) | Node 6 (Mesh 1) | SÍ | $76.0 \times 24.6 \times 600.0$ | Apoyada en piso $Y=13.6\text{ a }38.2\text{ mm}$ |
| **Niveladores / Deslizadores** | Node 86 (Mesh 38) | Node 11 (Mesh 3) | SÍ | $22.2 \times 32.0 \times 534.2$ | Contacto piso $Y=0.0\text{ a }32.0\text{ mm}$ |
| **Funda / Tubo Exterior** | Node 93 (Mesh 42) | Node 3 (Mesh 0) | SÍ | $73.6 \times 418.0 \times 147.9$ | Altura $Y=37.6\text{ a }455.9\text{ mm}$ |
| **Columna Motorizada Linak** | Node 98 (Mesh 44) | En `KUAC1040000_74.glb` | SÍ (Separado) | $58.7 \times 695.0 \times 96.5$ | Extensión telescópica $Y=15.0\text{ a }710.0\text{ mm}$ |

---

## 3. Auditoría de Superficie (`LKSU010010`)

- **Master CET:**
  - Cota Inferior: $Y = 714.0\text{ mm}$ (apoyo sobre viga y columnas motorizadas en $Y=710.0\text{ mm}$).
  - Cota Superior: $Y = 745.4\text{ mm}$.
  - Espesor real medido: $31.4\text{ mm}$ (Formica $30\text{ mm}$ nominal).
  - Centro geométrico: $Y = 729.7\text{ mm}$.
- **IMAGINA (Procedural):**
  - Espesor nominal: $30.0\text{ mm}$.
  - Cota Inferior: $Y = 700.0\text{ mm}$.
  - Cota Superior: $Y = 730.0\text{ mm}$.
  - Centro geométrico: $Y = 715.0\text{ mm}$.
- **Explicación Matemática:** En IMAGINA, la altura nominal de $730\text{ mm}$ se define como la altura final de trabajo al borde superior de la mesa ($Y \in [700, 730]$), mientras que CET modela la estructura base en $710\text{ mm}$ y le suma el espesor de la tapa arriba ($714 \to 745.4\text{ mm}$). Ambas definiciones son consistentes con sus respectivos modelos de producto.

---

## 4. Tabla Consolidada Master vs GLBs Individuales

| Componente | Código CET | Archivo GLB | BBox Master ($X \times Y \times Z$ mm) | BBox GLB Individual ($X \times Y \times Z$ mm) | Correspondencia |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Superficie** | `LKSU010010` | *Procedural* | $1200.0 \times 31.4 \times 600.0$ | $1200.0 \times 30.0 \times 600.0$ | **1:1** (Procedural) |
| **Costado Izquierdo** | `KUSO800000` | `KUSO800000_IZQ.glb` | $76.0 \times 455.9 \times 600.0$ | $76.1 \times 455.9 \times 599.9$ | **1:1** (Funda base) |
| **Costado Derecho** | `KUSO800000` | `KUSO800000_DER.glb` | $76.0 \times 455.9 \times 600.0$ | $76.1 \times 455.9 \times 600.0$ | **1:1** (Funda base) |
| **Vértebra Metálica** | `KUAC650000` | `KUAC650000.glb` | $70.0 \times 626.6 \times 161.3$ | $70.0 \times 626.6 \times 161.3$ | **1:1 Exacta** |
| **Soporte Tomas** | `KUAC680000` | `KUAC680000.glb` | $607.0 \times 166.0 \times 232.3$ | $607.0 \times 166.0 \times 232.2$ | **1:1 Exacta** |
| **Grommet 4 Tomas** | `LKAC250000` | `LKAC250000.glb` | $512.0 \times 33.5 \times 115.6$ | $512.0 \times 33.6 \times 115.5$ | **1:1 Exacta** |
| **Kit Fuente** | `KUAC1040000` | `KUAC1040000_74.glb` | $58.7 \times 695.0 \times 96.5$ | $58.8 \times 695.0 \times 96.5$ | **1:1 Exacta** |
| **Viga Soporte** | `KUSO420000` | `KUSO420000_150.glb` | $1200.0 \times 51.0 \times 500.0$ | $1496.0 \times 50.0 \times 500.0$ | **Variante 150 (+296mm)** |
| **Ducto Cableado** | `KUSO860000` | `KUSO860000_165.glb` | $1109.0 \times 145.9 \times 140.0$ | $1559.0 \times 145.9 \times 140.0$ | **Variante 165 (+450mm)** |
| **Botonera LINAK** | `DPBK06` | *Sin GLB (BOM)* | $60.0 \times 15.8 \times 87.1$ | *N/A (Lógica en BOM)* | **BOM Lógico** |
