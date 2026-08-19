# Auditoría Dimensional y de Variantes Físicas GLB — KUO AV (Vigas y Ductos)

## 1. Catálogo de Archivos GLB Auditados Físicamente

Todos los archivos residen físicamente en `public/assets/models/Kuo AV/`.
Se realizó una inspección matemática de los nodos, jerarquías de mallas, matrices locales y vértices de cada archivo.

| Archivo GLB | Componente | Variante Nominal | Ancho Real ($X$) | Alto Real ($Y$) | Fondo Real ($Z$) | Vértices | Meshes | Matriz Raíz / Orientación |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `KUSO420000_120.glb` | Viga Soporte | 1200 mm | **1196.0 mm** | 50.0 mm | 500.0 mm | 4,041 | 2 | $Y$-up normalizada ($+Z \to -Y$) |
| `KUSO420000_150.glb` | Viga Soporte | 1500 mm | **1496.0 mm** | 50.0 mm | 500.0 mm | 3,710 | 2 | $Y$-up normalizada ($+Z \to -Y$) |
| `KUSO420000_165.glb` | Viga Soporte | 1650 mm | **1646.0 mm** | 50.0 mm | 500.0 mm | 3,714 | 2 | $Y$-up normalizada ($+Z \to -Y$) |
| `KUSO860000_120.glb` | Ducto Cableado | 1200 mm | **1109.0 mm** | 145.9 mm | 140.0 mm | 8,414 | 6 | $Y$-up normalizada ($+Z \to -Y$) |
| `KUSO860000_150.glb` | Ducto Cableado | 1500 mm | **1409.0 mm** | 145.9 mm | 140.0 mm | 8,724 | 6 | $Y$-up normalizada ($+Z \to -Y$) |
| `KUSO860000_165.glb` | Ducto Cableado | 1650 mm | **1559.0 mm** | 145.9 mm | 140.0 mm | 8,863 | 6 | $Y$-up normalizada ($+Z \to -Y$) |

---

## 2. Sistema Centralizado de Resolución de Variantes

En `src/mepal/kuoAV/config/kuoAVTunables.js` se implementó la función unificada:

```javascript
resolveKuoAVVariantAsset({ component, anchoMm })
```

### Reglas de Mapeo Determinístico:

1. **Mesa 1200 mm:**
   - Viga: `KUSO420000_120.glb` (Largo real: 1196 mm, centrado en $X \in [-598.0, +598.0]\text{ mm}$).
   - Ducto: `KUSO860000_120.glb` (Largo real: 1109 mm, centrado en $X \in [-554.5, +554.5]\text{ mm}$).
   - Coincidencia con Master CET: **100% IDÉNTICA**.
2. **Mesa 1500 mm:**
   - Viga: `KUSO420000_150.glb` (Largo real: 1496 mm, centrado en $X \in [-748.0, +748.0]\text{ mm}$).
   - Ducto: `KUSO860000_150.glb` (Largo real: 1409 mm, centrado en $X \in [-704.5, +704.5]\text{ mm}$).
3. **Mesa 1650 mm:**
   - Viga: `KUSO420000_165.glb` (Largo real: 1646 mm, centrado en $X \in [-823.0, +823.0]\text{ mm}$).
   - Ducto: `KUSO860000_165.glb` (Largo real: 1559 mm, centrado en $X \in [-779.5, +779.5]\text{ mm}$).

---

## 3. Comportamiento Paramétrico del Ensamble por Medida

| Medida Mesa ($X$) | Costado Izq ($X$) | Costado Der ($X$) | Paral Izq ($X$) | Paral Der ($X$) | Viga Bounds ($X$) | Ducto Bounds ($X$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1200 mm** | $[-600.0, -512.6]$ | $[+512.7, +600.1]$ | $[-588.8, -530.0]$ | $[+526.2, +585.0]$ | $[-598.0, +598.0]$ | $[-554.5, +554.5]$ |
| **1500 mm** | $[-750.0, -662.6]$ | $[+662.7, +750.1]$ | $[-738.8, -680.0]$ | $[+676.2, +735.0]$ | $[-748.0, +748.0]$ | $[-704.5, +704.5]$ |
| **1650 mm** | $[-825.0, -737.6]$ | $[+737.7, +825.1]$ | $[-813.8, -755.0]$ | $[+751.2, +810.0]$ | $[-823.0, +823.0]$ | $[-779.5, +779.5]$ |

---

## 4. Estado de los Componentes Accesorios y Mecanismos

- **Vértebra (`KUAC650000.glb`):** Calibrada con rotación de 180° en $Y$, posición $[35.0, 25.0, -250.0]\text{ mm}$, orientando la placa de soporte superior hacia la tapa y el ducto.
- **Parales / Columnas (`KUAC1040000_74.glb`):** Doble instancia independiente (izq y der) alojadas dentro de los canales "L" de los costados en todas las configuraciones.
- **Soporte de Tomas (`KUAC680000.glb`) y Grommet (`LKAC250000.glb`):** Centrados y anclados a la superficie sin colisiones.
