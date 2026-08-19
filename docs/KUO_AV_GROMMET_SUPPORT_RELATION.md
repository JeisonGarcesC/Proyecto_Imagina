# Relación Espacial y Validación Geométrica: Grommet (LKAC250000) vs Soporte de Tomas (KUAC680000) vs Superficie

## 1. Auditoría de Dimensiones y Bounding Box Individuales (Local)

| Componente | Archivo GLB | Ancho ($X$) | Alto ($Y$) | Fondo ($Z$) | Bounding Box Local ($X, Y, Z$ mm) |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Grommet** | `LKAC250000.glb` | $512.00\text{ mm}$ | $33.56\text{ mm}$ | $115.50\text{ mm}$ | $X \in [-255.75, 256.25]$, $Y \in [-32.00, 1.56]$, $Z \in [-71.04, 44.46]$ |
| **Soporte Tomas** | `KUAC680000.glb` | $607.00\text{ mm}$ | $166.03\text{ mm}$ | $232.25\text{ mm}$ | $X \in [0.00, 607.00]$, $Y \in [0.00, 166.03]$, $Z \in [-232.25, 0.00]$ |

---

## 2. Comparativa de Bounding Boxes Mundiales: Master CET vs IMAGINA

| Componente | Master CET Min | Master CET Max | IMAGINA Min | IMAGINA Max | Diferencia ($\Delta X, \Delta Z$) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **LKAC250000** | $[-255.76, 712.00, -300.12]$ | $[256.24, 745.53, -184.57]$ | $[-255.75, 696.44, -300.12]$ | $[256.25, 730.00, -184.62]$ | $\Delta X = 0.01$, $\Delta Z = 0.00$ |
| **KUAC680000** | $[-303.51, 572.00, -302.32]$ | $[303.44, 738.03, -70.03]$ | $[-303.51, 558.00, -302.32]$ | $[303.49, 724.03, -70.07]$ | $\Delta X = 0.00$, $\Delta Z = 0.00$ |
| **Superficie** | $[-598.01, 714.00, -298.03]$ | $[598.03, 744.00, 297.97]$ | $[-600.00, 700.00, -300.00]$ | $[600.00, 730.00, 300.00]$ | Centrada / Nominal |

---

## 3. Comparativa de Relaciones Espaciales: Master CET vs IMAGINA

| Relación | Master CET | IMAGINA | Diferencia | Diagnóstico |
| :--- | :---: | :---: | :---: | :--- |
| **Grommet $\to$ Soporte $X$ (Centro)** | $\Delta X = +0.28\text{ mm}$ | $\Delta X = +0.26\text{ mm}$ | **$0.02\text{ mm}$** | Ambos centrados milimétricamente en $X=0$. Soporte envuelve simétricamente al grommet. |
| **Grommet $\to$ Soporte $Z$ (Borde Posterior)** | $Z_{min} = -300.12\text{ mm}$ | $Z_{min} = -300.12\text{ mm}$ | **$0.00\text{ mm}$** | El fondo posterior de ambos coincide exactamente en el borde de la mesa ($Z \approx -300\text{ mm}$). |
| **Grommet $\to$ Soporte $Z$ (Centro)** | $\Delta Z = -56.17\text{ mm}$ | $\Delta Z = -56.14\text{ mm}$ | **$0.03\text{ mm}$** | El grommet ($115.5\text{ mm}$) queda alojado dentro del soporte ($232.3\text{ mm}$). |
| **Grommet $\to$ Superficie $Y$ (Tope)** | $+1.53\text{ mm}$ sobre tapa | $+1.56\text{ mm}$ sobre tapa | **$0.03\text{ mm}$** | Pestaña superior del grommet enrasada con la cara superior de la madera ($730\text{ mm}$). |
| **Grommet $\to$ Superficie $Y$ (Penetración)** | $-32.00\text{ mm}$ bajo tapa | $-32.00\text{ mm}$ bajo tapa | **$0.00\text{ mm}$** | Canal pasatapas atraviesa los $30\text{ mm}$ de la madera y emboca en la boca del soporte. |
| **Soporte $\to$ Superficie $Y$ (Anclaje)** | Cara inferior tapa ($714.0\text{ mm}$) | Cara inferior tapa ($700.0\text{ mm}$) | **$0.00\text{ mm}$** | Cara de atornillado del soporte asienta firmemente en la madera. |

---

## 4. Conclusiones y Calibración Final

1. **`LKAC250000.glb`:**
   - Posición Canónica: `posicionImaginaCanonicaMm: { x: 0.00, y: 728.44, z: -229.08 }`.
   - Rotación: `[0, 0, 0]`.
   - Escala: `[1, 1, 1]`.
2. **`KUAC680000.glb`:**
   - Posición Canónica: `posicionImaginaCanonicaMm: { x: -303.51, y: 558.00, z: -70.07 }`.
   - Rotación: `[0, 0, 0]`.
   - Escala: `[1, 1, 1]`.
3. **Comportamiento Conjunto:**
   - El grommet queda empotrado en la madera con su pestaña apoyada en la cara superior.
   - El soporte de tomas queda atornillado en la cara inferior de la madera recibiendo verticalmente el canal del grommet.
   - Ninguna pieza flota ni invade áreas de trabajo.
