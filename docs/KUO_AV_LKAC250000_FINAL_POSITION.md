# Posicionamiento Final y Calibración de Empotramiento LKAC250000 — KUO AV

## 1. Transformación Original del Master CET (`KuoGo_prueba_01.glb`)
- **Nodos de la Jerarquía en Master CET:** Nodos 28 a 36 (`be41c92d...`, `f7e4a52b...`, `fd91453a...`).
- **Matriz de Transformación del Master CET:**
  $$\begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0.600 & -0.071 & 0.744 & 1 \end{bmatrix}$$
- **Rotación:** $[0, 0, 0]^\circ$ (sin rotación respecto a los ejes principales).
- **Dimensiones Reales:** $512.01\text{ mm (ancho } X\text{)} \times 33.53\text{ mm (alto } Y\text{)} \times 115.55\text{ mm (fondo } Z\text{)}$.
- **Bounding Box Mundial en CET:**
  - $X \in [-255.76, +256.24]\text{ mm}$ (Centro: $X = 0.24\text{ mm}$)
  - $Y \in [712.00, 745.53]\text{ mm}$ (Centro: $Y = 728.76\text{ mm}$)
  - $Z \in [-300.12, -184.57]\text{ mm}$ (Centro: $Z = -242.34\text{ mm}$)

---

## 2. Transformación y Bounding Box del GLB Individual (`LKAC250000.glb`)
- **Vértices:** 20,162 vértices idénticos a los del Master CET.
- **Bounding Box Local del GLB:**
  - $X \in [-255.75, +256.25]\text{ mm}$
  - $Y \in [-32.00, +1.56]\text{ mm}$ (origen $Y=0$ ubicado en la base de la pestaña perimetral superior)
  - $Z \in [-71.04, +44.46]\text{ mm}$ (origen $Z=0$ centrado respecto al eje del cepillo pasatapas)

---

## 3. Relación de Empotramiento con la Superficie
- **Cara Superior de la Superficie:** $Y = 730.00\text{ mm}$ (para mesa de altura estándar $730\text{ mm}$ con espesor $30\text{ mm}$).
- **Cara Inferior de la Superficie:** $Y = 700.00\text{ mm}$.
- **Posición de Inserción Aplicada:**
  - $X = 0.00\text{ mm}$
  - $Y = 730.00\text{ mm}$ (enrasado con la cara superior de la madera)
  - $Z = -229.08\text{ mm}$
- **Bounding Box Resultante en IMAGINA:**
  - $X \in [-255.75, +256.25]\text{ mm}$ (Diferencia vs Master: **$0.01\text{ mm}$**)
  - $Y \in [698.00, 731.56]\text{ mm}$ (Diferencia vs cota de tapa: reborde sobresale $+1.56\text{ mm}$ y cuerpo penetra $-32.00\text{ mm}$)
  - $Z \in [-300.12, -184.62]\text{ mm}$ (Diferencia vs Master: **$0.00\text{ mm}$**)

---

## 4. Comparativa Master CET vs IMAGINA

| Parámetro | Master CET | IMAGINA (Corregido) | Diferencia ($\Delta$) |
| :--- | :---: | :---: | :---: |
| **X (Centro)** | $0.24\text{ mm}$ | $0.25\text{ mm}$ | **$0.01\text{ mm}$** |
| **Z (Centro)** | $-242.34\text{ mm}$ | $-242.34\text{ mm}$ | **$0.00\text{ mm}$** |
| **Ancho ($X$)** | $512.01\text{ mm}$ | $512.00\text{ mm}$ | **$0.01\text{ mm}$** |
| **Fondo ($Z$)** | $115.55\text{ mm}$ | $115.50\text{ mm}$ | **$0.05\text{ mm}$** |
| **Alto ($Y$)** | $33.53\text{ mm}$ | $33.56\text{ mm}$ | **$0.03\text{ mm}$** |
| **Pestaña Superior** | $+1.53\text{ mm}$ sobre tapa | $+1.56\text{ mm}$ sobre tapa | **$0.03\text{ mm}$** |
| **Empotramiento** | $-32.00\text{ mm}$ bajo tapa | $-32.00\text{ mm}$ bajo tapa | **$0.00\text{ mm}$** |
| **Escala** | $[1, 1, 1]$ | $[1, 1, 1]$ | **$0.00$** |
| **Rotación** | $[0, 0, 0]^\circ$ | $[0, 0, 0]^\circ$ | **$0^\circ$** |

---

## 5. Salida de Validación

```
[KUO LKAC250000 FINAL]
Position:
[0.00, 730.00, -229.08]
Rotation:
[0, 0, 0]
Scale:
[1, 1, 1]
Local BBox:
min [-255.75, -32.00, -71.04]
max [256.25, 1.56, 44.46]
World BBox:
min [-255.75, 698.00, -300.12]
max [256.25, 731.56, -184.62]
Dimensions:
512.00 x 33.56 x 115.50 mm
Surface Top:
730.00 mm
Surface Bottom:
700.00 mm
Embedding:
32.00 mm
Offset aplicado:
X = 0.00
Y = 0.00
Z = 0.00
```
