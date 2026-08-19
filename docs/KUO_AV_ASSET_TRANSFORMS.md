# Transformaciones Base y Conversión de Ejes de Assets: KUO AV - Superficie Perimetral

---

## 1. Matriz de Transformaciones de Ejes (CAD Z-up a Three.js Y-up)

Se implementó la función centralizada `applyKuoAVAssetTransform(partObject, part)` en `src/mepal/kuoAV/transform/kuoAVAssetTransforms.js`, la cual aplica la rotación de conversión $R_x = -\pi/2$ ($-90^\circ$) y mantiene la escala limpia en $(1, 1, 1)$ sin distorsiones arbitrarias.

| Código | GLB | Ejes Originales (CAD) | Transformación Aplicada | Dimensiones Después en Three.js ($X, Y, Z$) | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **KUSO800000** (IZQ) | `KUSO800000_IZQ.glb` | $Z$-up ($X=87.4, Y=600, Z=455.9$) | $R_x = -\pi/2$, Scale $(1,1,1)$ | Ancho $X=87.4\text{ mm}$, Alto $Y=455.9\text{ mm}$, Fondo $Z=600\text{ mm}$ | **Correcto** |
| **KUSO800000** (DER) | `KUSO800000_DER.glb` | $Z$-up ($X=87.4, Y=600, Z=455.9$) | $R_x = -\pi/2$, Scale $(1,1,1)$ | Ancho $X=87.4\text{ mm}$, Alto $Y=455.9\text{ mm}$, Fondo $Z=600\text{ mm}$ | **Correcto** |
| **KUSO420000** | `KUSO420000_150.glb` | $Z$-up ($X=1496, Y=500, Z=50$) | $R_x = -\pi/2$, Scale $(1,1,1)$ | Ancho $X=1496.0\text{ mm}$, Alto $Y=50.0\text{ mm}$, Fondo $Z=500.0\text{ mm}$ | **Correcto** |
| **KUSO860000** | `KUSO860000_165.glb` | $Z$-up ($X=1559, Y=140, Z=145.9$) | $R_x = -\pi/2$, Scale $(1,1,1)$ | Ancho $X=1559.0\text{ mm}$, Alto $Y=145.9\text{ mm}$, Fondo $Z=140.0\text{ mm}$ | **Correcto** |
| **KUAC650000** | `KUAC650000.glb` | $Z$-up ($X=70, Y=161.3, Z=626.6$) | $R_x = -\pi/2$, Scale $(1,1,1)$ | Ancho $X=70.0\text{ mm}$, Alto $Y=626.6\text{ mm}$, Fondo $Z=161.3\text{ mm}$ | **Correcto** |
| **KUAC1040000** | `KUAC1040000_74.glb` | $Z$-up ($X=58.8, Y=96.5, Z=695$) | $R_x = -\pi/2$, Scale $(1,1,1)$ | Ancho $X=58.8\text{ mm}$, Alto $Y=695.0\text{ mm}$, Fondo $Z=96.5\text{ mm}$ | **Correcto** |
| **KUAC680000** | `KUAC680000.glb` | $Z$-up ($X=607, Y=232.2, Z=166$) | $R_x = -\pi/2$, Scale $(1,1,1)$ | Ancho $X=607.0\text{ mm}$, Alto $Y=166.0\text{ mm}$, Fondo $Z=232.2\text{ mm}$ | **Correcto** |
| **LKAC250000** | `LKAC250000.glb` | $Z$-up ($X=512, Y=115.5, Z=33.6$) | $R_x = -\pi/2$, Scale $(1,1,1)$ | Ancho $X=512.0\text{ mm}$, Alto $Y=33.6\text{ mm}$, Fondo $Z=115.5\text{ mm}$ | **Correcto** |

---

## 2. Resultado Esperado en Validación (1200 x 600 x 730 mm, e=30mm)

Al cargar la mesa con la configuración base:

1. **Superficie (`LKSU010010`):**
   - Permanece completamente horizontal en el plano $X-Z$ a la altura de trabajo $Y = 730\text{ mm}$.
2. **Costado Izquierdo y Costado Derecho (`KUSO800000`):**
   - Quedan orientados verticalmente en $Y$ (desde piso $Y=0$), con el pie de apoyo extendiéndose a lo largo de la profundidad $Z$ ($600\text{ mm}$).
3. **Viga Soporte (`KUSO420000`):**
   - Queda orientada horizontalmente a lo largo del eje $X$ bajo la superficie perimetral.
4. **Ducto Cableado (`KUSO860000`):**
   - Queda orientado horizontalmente a lo largo del eje $X$ bajo la viga de soporte.
5. **Vértebra Pasacables (`KUAC650000`):**
   - Se yergue verticalmente desde el piso ($Y=0$) hacia la parte inferior de la superficie ($Y=626.6\text{ mm}$).
6. **Kit Fuente y Soporte de Tomas (`KUAC1040000`, `KUAC680000`):**
   - Quedan alineados en el plano de electrificación bajo tapa.
7. **Grommet 4 Tomas (`LKAC250000`):**
   - Queda plano sobre la superficie con su reborde superior en $Y$.

---

## 3. Elementos Pendientes para Pasos Posteriores de Alineación Fina

- **Offsets de Centrado de Origen:**
  - La viga `KUSO420000_150` y el ducto `KUSO860000_165` tienen su origen geométrico en el extremo $X=0$. En el siguiente paso se podrá aplicar el offset de centrado $X = -L/2$ para que queden simétricos respecto al centro de la mesa.
- **Offsets de Apoyo en Costados:**
  - Ajuste fino del offset $Z$ del pie de las columnas para coincidir con el centro del fondo de la mesa ($Z=0$).
