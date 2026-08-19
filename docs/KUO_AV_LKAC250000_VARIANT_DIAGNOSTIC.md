# Diagnóstico Definitivo de LKAC250000 — Comparación con Master CET

## 1. Identificación y Extracción Geométrica del Modelo Maestro (`KuoGo_prueba_01.glb`)

En el modelo maestro exportado desde CET (`KuoGo_prueba_01.glb`, mesa individual de $1200 \times 600\text{ mm}$):
- **Rama / Nodos de Grommet:** Nodos 28 a 36 (`be41c92d...`, `f7e4a52b...`, `fd91453a...`).
- **Mallas asociadas:** 6 primitivas / meshes.
- **Cantidad de vértices:** **20,162 vértices** (4,774 en el marco de aluminio + 15,388 en el cepillo pasacables).
- **Dimensiones Reales:**
  - Ancho ($X$): $512.01\text{ mm}$
  - Alto ($Y$): $33.53\text{ mm}$
  - Fondo ($Z$): $115.55\text{ mm}$
- **Bounding Box Mundial en CET:**
  - $X \in [-255.76, +256.24]\text{ mm}$ (centrado en $X = 0.24\text{ mm}$)
  - $Y \in [712.00, 745.53]\text{ mm}$
  - $Z \in [-300.12, -184.57]\text{ mm}$ (ubicado al borde posterior de la superficie)

---

## 2. Relación de Empotramiento con la Superficie

En el Master CET:
- La superficie de CET tiene su cara superior en $Y = 744.0\text{ mm}$ y su cara inferior en $Y = 714.0\text{ mm}$ (espesor de $30\text{ mm}$).
- El grommet apoya su pestaña perimetral en la cara superior de la mesa ($Y = 745.53\text{ mm}$, sobresaliendo apenas $1.5\text{ mm}$).
- El canal pasatapas penetra hacia abajo a través del espesor de la madera hasta $Y = 712.0\text{ mm}$ (alcanzando la cara inferior de la tapa y conectando con el soporte de tomas `KUAC680000`).

---

## 3. Comparativa: Master CET vs GLBs Candidatos

| Parámetro | Master CET (`KuoGo_prueba_01.glb`) | `LKAC250000.glb` (Candidato 1) | `LKAC250000_DOBLE.glb` (Candidato 2) | Conclusión |
| :--- | :---: | :---: | :---: | :--- |
| **Ancho ($X$)** | $512.01\text{ mm}$ | $512.00\text{ mm}$ | $512.00\text{ mm}$ | Idéntico en ambos |
| **Alto ($Y$)** | $33.53\text{ mm}$ | $33.56\text{ mm}$ | $33.50\text{ mm}$ | Idéntico en ambos |
| **Fondo ($Z$)** | **$115.55\text{ mm}$** | **$115.50\text{ mm}$** | **$257.00\text{ mm}$** | `LKAC250000.glb` es la pieza del Master |
| **Vértices** | **20,162** | **20,162** | **40,132** | `LKAC250000.glb` coincide al 100% |
| **Meshes** | 6 | 6 | 12 | `LKAC250000.glb` coincide al 100% |
| **Materiales** | Aluminio + Cepillo | Material 1, transparencyGM | transparencyGM | Mismos materiales |
| **Destino de Uso** | Mesa individual perimetral | Mesa individual perimetral | Estación doble / Bench enfrentado | `LKAC250000.glb` es el correcto |

---

## 4. Diagnóstico de la Causa Raíz de la Desalineación en IMAGINA

1. **El GLB `LKAC250000.glb` es el correcto al 100%:** No requería cambio de modelo ni escala.
2. **Causa del desajuste visual previo:**
   - En el Master CET, la superficie estaba posicionada con tope en $Y = 744.0\text{ mm}$, por lo que en `KUO_AV_CALIBRATION` se había registrado `posicionMm.y = 744.0`.
   - Sin embargo, en IMAGINA la superficie procedural de $1200 \times 600 \times 30\text{ mm}$ tiene su cota superior en $Y = 730.0\text{ mm}$.
   - Al renderizar el grommet a $Y = 744.0\text{ mm}$, quedaba $14\text{ mm}$ **flotando por encima de la tapa**, aparentando ser una pieza suelta o levantada.
3. **Corrección Realizada:**
   - La cota $Y$ del grommet se configuró a $Y = 730.0\text{ mm}$ (enrasada con la cara superior de la superficie).
   - Su reborde superior queda en $Y = 731.56\text{ mm}$ y su cuerpo penetra hasta $Y = 698.0\text{ mm}$, logrando un **empotramiento perfecto en la superficie**.

---

## 5. Salida de Consola y Comprobación Dimensional

```
[KUO GROMMET]
Mesa: 1200
Variante seleccionada: LKAC250000.glb
Posición: [0, 730, -229]
Rotación: [0, 0, 0]

[KUO GROMMET]
Mesa: 1500
Variante seleccionada: LKAC250000.glb
Posición: [0, 730, -229]
Rotación: [0, 0, 0]

[KUO GROMMET]
Mesa: 1650
Variante seleccionada: LKAC250000.glb
Posición: [0, 730, -229]
Rotación: [0, 0, 0]
```
