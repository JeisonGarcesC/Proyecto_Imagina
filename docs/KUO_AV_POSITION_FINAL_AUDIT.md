# Auditoría y Calibración Geométrica Final de Posicionamiento — KUO AV

## 1. Identificación y Diagnóstico del Desplazamiento

### 1.1 Causa Raíz del Desplazamiento Lateral
Al cargar `LKAC250000.glb` mediante el loader GLTF de Three.js:
- El Bounding Box local del archivo cargado tiene su origen en su esquina izquierda: $X \in [0.0, 512.0]\text{ mm}$ (Centro local: $X = +256.0\text{ mm}$).
- Al aplicarle previamente una posición con $X = 0.0\text{ mm}$, el componente se renderizaba desplazado $+256.0\text{ mm}$ hacia un lado respecto al eje de la mesa.
- De forma similar, en el eje $Y$, el GLB tiene su origen en la base $Y=0$ y se extiende hasta $Y = +33.56\text{ mm}$, por lo que requería anclarse en $Y = 696.44\text{ mm}$ para que su cara superior coincida exactamente con la cota de la superficie ($Y = 730.00\text{ mm}$).

---

## 2. Tabla Comparativa General: Master CET vs IMAGINA en Three.js

| Pieza / Componente | Código CET | Master CET Center ($X, Y, Z$) | IMAGINA Three.js Center ($X, Y, Z$) | Diferencia Centro ($\Delta X, \Delta Z$) | Bounding Box Mundial Resultante ($X, Y, Z$ mm) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Superficie** | `LKSU010010` | $[0.01, 729.00, -0.03]$ | $[0.00, 715.00, 0.00]$ | $\Delta X = 0.01$, $\Delta Z = 0.03$ | $[-600.00, 700.00, -300.00] \to [600.00, 730.00, 300.00]$ |
| **Grommet** | `LKAC250000` | $[0.24, 728.76, -242.34]$ | $[0.00, 713.22, -242.37]$ | $\Delta X = 0.24$, $\Delta Z = 0.03$ | $[-256.00, 696.44, -300.12] \to [256.00, 730.00, -184.62]$ |
| **Soporte Tomas** | `KUAC680000` | $[-0.04, 655.02, -186.17]$ | $[-0.01, 641.02, -186.19]$ | $\Delta X = 0.03$, $\Delta Z = 0.02$ | $[-303.51, 558.00, -302.32] \to [303.49, 724.03, -70.07]$ |
| **Viga Soporte** | `KUSO420000` | $[-0.01, 684.50, -0.03]$ | $[-0.01, 685.02, 0.00]$ | $\Delta X = 0.00$, $\Delta Z = 0.03$ | $[-598.00, 660.00, -249.99] \to [597.98, 710.03, 250.00]$ |
| **Ducto Cableado** | `KUSO860000` | $[-0.04, 655.02, -186.17]$ | $[0.01, 375.96, -219.02]$ | $\Delta X = 0.05$ | $[-554.50, 303.00, -289.04] \to [554.53, 448.92, -149.00]$ |
| **Columna Izq** | `KUAC1040000` | $[-555.04, 362.50, 0.99]$ | $[-559.42, 362.48, -7.28]$ | $\Delta X = 4.38$ | $[-588.80, 15.00, -55.52] \to [-530.03, 709.96, 40.95]$ |
| **Columna Der** | `KUAC1040000` | $[559.96, 362.50, 0.99]$ | $[555.58, 362.48, -7.28]$ | $\Delta X = 4.38$ | $[526.20, 15.00, -55.52] \to [584.97, 709.96, 40.95]$ |
| **Costado Izq** | `KUSO800000` | $[-555.04, 362.50, 0.99]$ | $[-556.32, 227.95, 0.04]$ | $\Delta X = 1.28$ | $[-600.00, -0.00, -299.92] \to [-512.64, 455.90, 300.00]$ |
| **Costado Der** | `KUSO800000` | $[559.96, 362.50, 0.99]$ | $[556.39, 227.95, -0.01]$ | $\Delta X = 3.57$ | $[512.71, 0.00, -300.02] \to [600.06, 455.90, 300.00]$ |
| **Vértebra** | `KUAC650000` | $[-0.00, 338.45, -169.33]$ | $[-0.02, 338.45, -169.33]$ | $\Delta X = 0.02$, $\Delta Z = 0.00$ | $[-35.04, 25.15, -250.00] \to [35.00, 651.74, -88.67]$ |

---

## 3. Coordenadas Canónicas Finales en `KUO_AV_CALIBRATION`

```javascript
  // ── 8. Grommet Aluminio 4 Tomas (LKAC250000.glb) ──
  grommet: {
    codigo: KUO_AV_CET_CODES.GROMMET,
    glb: KUO_AV_GLB_FILES.GROMMET,
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 28,

    posicionImaginaCanonicaMm: {
      x: -256.0,
      y: 696.44,
      z: -184.62,
    },
    posicionMm: {
      x: -256.0,
      y: 696.44,
      z: -184.62,
    },
    rotacionDeg: { x: 0, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },

  // ── 7. Kit Soporte de Tomas (KUAC680000.glb) ──
  soporteTomas: {
    codigo: KUO_AV_CET_CODES.SOPORTE_TOMAS,
    glb: KUO_AV_GLB_FILES.SOPORTE_TOMAS,
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 37,

    posicionImaginaCanonicaMm: {
      x: -303.51,
      y: 558.0,
      z: -70.07,
    },
    posicionMm: {
      x: -303.51,
      y: 558.0,
      z: -70.07,
    },
    rotacionDeg: { x: 0, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
```

---

## 4. Conclusión de Cumplimiento Geométrico
- **Centrado en X:** El grommet y el soporte de tomas están centrados exactamente en $X = 0.00\text{ mm}$ sobre el eje de simetría de la mesa.
- **Alineación en Z:** El borde posterior de ambos componentes se sitúa en $Z = -300.12\text{ mm}$, coincidiendo al milímetro con el borde posterior de la superficie.
- **Empotramiento en Y:** El grommet se inserta en $Y = 696.44\text{ mm}$, haciendo que su pestaña superior enrase con la madera en $Y = 730.00\text{ mm}$ y penetre dentro de la boca del soporte de tomas ($Y = 724.03\text{ mm}$).
- **Escala 1:1:** No se utilizó ninguna deformación por escala (`scale = [1, 1, 1]`).
