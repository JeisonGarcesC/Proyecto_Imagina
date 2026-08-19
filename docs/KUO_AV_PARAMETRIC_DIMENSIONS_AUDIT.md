# Auditoría de Manipulación Paramétrica de Dimensiones — KUO AV

## 1. Resumen de Parametrización Real

El ensamble de **KUO AV - Superficie Perimetral** opera de forma 100% paramétrica respetando la calibración y sin deformar assets GLB (`scale = [1, 1, 1]`):

1. **Superficie:** Regenerada proceduralmente con las medidas exactas de `anchoMm`, `profundidadMm` y `thickMm`.
2. **Costados (`KUSO800000_IZQ` y `KUSO800000_DER`):** Reposicionados simétricamente en los extremos $X = \pm \text{anchoMm} / 2$.
3. **Columnas Motorizadas (`KUAC1040000` Izq y Der):** Se desplazan paramétricamente con el ancho de la mesa alojándose dentro del canal del costado.
4. **Viga Soporte (`KUSO420000`):** Selecciona automáticamente la variante física GLB según el ancho (`_120.glb`, `_150.glb`, `_165.glb`) y centra su posición en $X=0$.
5. **Ducto de Cableado (`KUSO860000`):** Selecciona automáticamente la variante física GLB correspondiente (`_120.glb`, `_150.glb`, `_165.glb`) y centra su posición en $X=0$.
6. **Accesorios Eléctricos (`KUAC680000` y `LKAC250000`):** Mantienen el centrado en $X=0$, su empotramiento vertical y su relación geométrica idéntica al Master CET.
7. **Vértebra Pasacables (`KUAC650000`):** Mantiene su geometría y bounds idénticos al Master CET.

---

## 2. Matriz de Validación Paramétrica por Configuración

### Caso A: $1200 \times 600 \times 730\text{ mm}$ (Espesor $30\text{ mm}$)

| Componente | Parámetro | GLB Seleccionado | Posición Three.js ($X, Y, Z$ mm) | Dimensión Real ($X, Y, Z$ mm) | Estado |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Superficie** | $1200 \times 600$ | *Procedural* | $[0.0, 715.0, 0.0]$ | $1200 \times 30 \times 600$ | **OK (1:1)** |
| **Costado Izquierdo** | Terminal Izq | `KUSO800000_IZQ.glb` | $[-600.0, 0.0, 300.0]$ | $87.36 \times 455.90 \times 599.92$ | **OK (1:1)** |
| **Costado Derecho** | Terminal Der | `KUSO800000_DER.glb` | $[524.0, 0.0, 300.0]$ | $87.35 \times 455.90 \times 600.02$ | **OK (1:1)** |
| **Viga Soporte** | Ancho $1200$ | `KUSO420000_120.glb` | $[-598.0, 660.0, 250.0]$ | $1195.98 \times 50.03 \times 499.99$ | **OK (1:1)** |
| **Ducto Cableado** | Ancho $1200$ | `KUSO860000_120.glb` | $[-554.5, 303.0, -149.0]$ | $1109.03 \times 145.92 \times 140.04$ | **OK (1:1)** |
| **Columna Izq** | Motorizada | `KUAC1040000_74.glb` | $[-584.4, 15.0, 32.7]$ | $58.77 \times 694.96 \times 96.47$ | **OK (1:1)** |
| **Columna Der** | Motorizada | `KUAC1040000_74.glb` | $[530.6, 15.0, 32.7]$ | $58.77 \times 694.96 \times 96.47$ | **OK (1:1)** |
| **Soporte Tomas** | Central | `KUAC680000.glb` | $[-303.51, 558.0, -70.07]$ | $607.00 \times 166.03 \times 232.25$ | **OK (1:1)** |
| **Grommet** | Central | `LKAC250000.glb` | $[-256.0, 696.44, -184.62]$ | $512.00 \times 33.56 \times 115.50$ | **OK (1:1)** |
| **Vértebra** | Izquierda | `KUAC650000.glb` | $[35.0, 25.0, -250.0]$ | $70.04 \times 626.59 \times 161.33$ | **OK (1:1)** |

---

### Caso B: $1400 \times 600 \times 730\text{ mm}$ (Espesor $30\text{ mm}$)

| Componente | Parámetro | GLB Seleccionado | Posición Three.js ($X, Y, Z$ mm) | Dimensión Real ($X, Y, Z$ mm) | Estado |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Superficie** | $1400 \times 600$ | *Procedural* | $[0.0, 715.0, 0.0]$ | $1400 \times 30 \times 600$ | **OK (1:1)** |
| **Costado Izquierdo** | Terminal Izq | `KUSO800000_IZQ.glb` | $[-700.0, 0.0, 300.0]$ | $87.36 \times 455.90 \times 599.92$ | **OK (1:1)** |
| **Costado Derecho** | Terminal Der | `KUSO800000_DER.glb` | $[624.0, 0.0, 300.0]$ | $87.35 \times 455.90 \times 600.02$ | **OK (1:1)** |
| **Viga Soporte** | Ancho $1400 \to 150$ | `KUSO420000_150.glb` | $[-748.0, 660.0, 250.0]$ | $1496.03 \times 50.00 \times 500.02$ | **OK (1:1)** |
| **Ducto Cableado** | Ancho $1400 \to 150$ | `KUSO860000_150.glb` | $[-704.5, 303.0, -149.0]$ | $1409.03 \times 145.92 \times 140.04$ | **OK (1:1)** |
| **Columna Izq** | Motorizada | `KUAC1040000_74.glb` | $[-684.4, 15.0, 32.7]$ | $58.77 \times 694.96 \times 96.47$ | **OK (1:1)** |
| **Columna Der** | Motorizada | `KUAC1040000_74.glb` | $[630.6, 15.0, 32.7]$ | $58.77 \times 694.96 \times 96.47$ | **OK (1:1)** |
| **Soporte Tomas** | Central | `KUAC680000.glb` | $[-303.51, 558.0, -70.07]$ | $607.00 \times 166.03 \times 232.25$ | **OK (1:1)** |
| **Grommet** | Central | `LKAC250000.glb` | $[-256.0, 696.44, -184.62]$ | $512.00 \times 33.56 \times 115.50$ | **OK (1:1)** |
| **Vértebra** | Izquierda | `KUAC650000.glb` | $[35.0, 25.0, -250.0]$ | $70.04 \times 626.59 \times 161.33$ | **OK (1:1)** |

---

### Caso C: $1500 \times 700 \times 730\text{ mm}$ (Espesor $30\text{ mm}$)

| Componente | Parámetro | GLB Seleccionado | Posición Three.js ($X, Y, Z$ mm) | Dimensión Real ($X, Y, Z$ mm) | Estado |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Superficie** | $1500 \times 700$ | *Procedural* | $[0.0, 715.0, 0.0]$ | $1500 \times 30 \times 700$ | **OK (1:1)** |
| **Costado Izquierdo** | Terminal Izq | `KUSO800000_IZQ.glb` | $[-750.0, 0.0, 300.0]$ | $87.36 \times 455.90 \times 599.92$ | **OK (1:1)** |
| **Costado Derecho** | Terminal Der | `KUSO800000_DER.glb` | $[674.0, 0.0, 300.0]$ | $87.35 \times 455.90 \times 600.02$ | **OK (1:1)** |
| **Viga Soporte** | Ancho $1500$ | `KUSO420000_150.glb` | $[-748.0, 660.0, 250.0]$ | $1496.03 \times 50.00 \times 500.02$ | **OK (1:1)** |
| **Ducto Cableado** | Ancho $1500$ | `KUSO860000_150.glb` | $[-704.5, 303.0, -149.0]$ | $1409.03 \times 145.92 \times 140.04$ | **OK (1:1)** |
| **Columna Izq** | Motorizada | `KUAC1040000_74.glb` | $[-734.4, 15.0, 32.7]$ | $58.77 \times 694.96 \times 96.47$ | **OK (1:1)** |
| **Columna Der** | Motorizada | `KUAC1040000_74.glb` | $[680.6, 15.0, 32.7]$ | $58.77 \times 694.96 \times 96.47$ | **OK (1:1)** |
| **Soporte Tomas** | Central | `KUAC680000.glb` | $[-303.51, 558.0, -70.07]$ | $607.00 \times 166.03 \times 232.25$ | **OK (1:1)** |
| **Grommet** | Central | `LKAC250000.glb` | $[-256.0, 696.44, -184.62]$ | $512.00 \times 33.56 \times 115.50$ | **OK (1:1)** |
| **Vértebra** | Izquierda | `KUAC650000.glb` | $[35.0, 25.0, -250.0]$ | $70.04 \times 626.59 \times 161.33$ | **OK (1:1)** |

---

## 3. Conclusiones

- El sistema responde dinámicamente tanto a los controles en pantalla (`KuoAVProperties.jsx`) como a `swapKuoAVVariant` en `ThreeCanvas.jsx`.
- Las vigas y ductos cargan automáticamente su archivo GLB sin escalados ni deformaciones.
- Los accesorios permanecen firmemente anclados y alineados a las caras de ensamble.
