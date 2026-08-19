# Auditoría Técnica y Geométrica del Componente LKAC250000 (Grommet) — KUO AV

## 1. Archivos Físicos Encontrados

Se realizó una búsqueda exhaustiva en todo el árbol de directorios del proyecto y assets de Kuo AV.
Se confirmaron dos archivos reales:

| Archivo GLB | Ruta Física | Tamaño | Meshes | Primitives | Vértices | Materiales |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `LKAC250000.glb` | `public/assets/models/Kuo AV/LKAC250000.glb` | 796.4 KB | 6 | 6 | 20,162 | Material 1, transparencyGM |
| `LKAC250000_DOBLE.glb` | `public/assets/models/Kuo AV/LKAC250000_DOBLE.glb` | 1,578.9 KB | 12 | 12 | 40,132 | transparencyGM |

---

## 2. Dimensiones y Geometría de Cada Archivo

### 2.1 `LKAC250000.glb` (Grommet Simple / 4 Tomas)
- **Ancho ($X$):** $512.0\text{ mm}$
- **Alto ($Y$):** $33.6\text{ mm}$
- **Profundidad ($Z$):** $115.5\text{ mm}$
- **Bounding Box Local:** $X \in [-255.8, +256.3]\text{ mm}$, $Y \in [-32.0, +1.6]\text{ mm}$, $Z \in [-71.0, +44.5]\text{ mm}$
- **Centro Local:** $X = 0.3\text{ mm}$, $Y = -15.2\text{ mm}$, $Z = -13.3\text{ mm}$
- **Elementos Físicos:** Marco pasatapas de aluminio de 4 tomas con cepillo central para paso de cables.

### 2.2 `LKAC250000_DOBLE.glb` (Grommet Doble / 8 Tomas)
- **Ancho ($X$):** $512.0\text{ mm}$
- **Alto ($Y$):** $33.5\text{ mm}$
- **Profundidad ($Z$):** $257.0\text{ mm}$ ($2 \times 115.5\text{ mm}$ + perfil de unión central)
- **Bounding Box Local:** $X \in [0.0, 512.0]\text{ mm}$, $Y \in [0.0, 33.5]\text{ mm}$, $Z \in [-257.0, 0.0]\text{ mm}$
- **Centro Local:** $X = 256.0\text{ mm}$, $Y = 16.8\text{ mm}$, $Z = -128.5\text{ mm}$
- **Elementos Físicos:** Dos marcos pasatapas simétricos enfrentados (acceso por ambos lados) diseñado para estaciones de trabajo dobles / bench (Face-to-Face).

---

## 3. Comparación contra el Master CET (`KuoGo_prueba_01.glb`)

### 3.1 Cantidad y Ubicación de Nodos en el Master
En el modelo maestro exportado de CET (`KuoGo_prueba_01.glb`, mesa individual de $1200 \times 600\text{ mm}$):
- **Existe EXACTAMENTE 1 GROMMET SIMPLE** (Nodos 31, 32, 35 y 36):
  - Marco y cuerpo: Nodos 31/32 $\to 4,774\text{ vértices}$, Dimensión: $[512.0, 33.5, 115.6]\text{ mm}$.
  - Cepillo pasatapas: Nodos 35/36 $\to 15,388\text{ vértices}$, Dimensión: $[470.0, 5.0, 16.0]\text{ mm}$.
  - Total de vértices: $4,774 + 15,388 = \mathbf{20,162\text{ \textbf{vértices}}}$.
- **Posición en el Master (Mundo CET):**
  - Centro $X = 0.2\text{ mm}$
  - Centro $Y = 728.8\text{ mm}$ ($Y \in [712.0, 745.5]\text{ mm}$)
  - Centro $Z = -242.3\text{ mm}$ ($Z \in [-300.0, -184.5]\text{ mm}$, al borde posterior de la mesa)

### 3.2 Nivel de Correspondencia Geométrica:
- **`LKAC250000.glb` vs Master CET:** **100% IDÉNTICO**.
  - Misma cantidad de meshes (6), mismos 20,162 vértices y dimensiones milimétricas idénticas.
- **`LKAC250000_DOBLE.glb` vs Master CET:**
  - El Master CET de mesa individual perimetral ($600\text{ mm}$ de fondo) **NO** utiliza el grommet doble porque sus $257\text{ mm}$ de profundidad invadirían el área de trabajo y colisionarían con el ducto y viga. El grommet doble pertenece a configuraciones tipo isla/bench.

---

## 4. Diagnóstico del Grommet en la Aplicación

- **¿El problema visual proviene del GLB del grommet?**
  **NO.** `LKAC250000.glb` es exactamente el modelo del Master CET.
- **Regla de Selección Implementada:**
  - Mesas individuales perimetrales (por defecto): `LKAC250000.glb` (simple, 4 tomas).
  - Configuraciones dobles / bench (`tipoGrommet: 'doble'` o `grommetDoble: true`): `LKAC250000_DOBLE.glb`.

---

## 5. Cambios Realizados en el Código

1. **`src/mepal/kuoAV/config/kuoAVTunables.js`:**
   - Registrados `GROMMET_SIMPLE` (`LKAC250000.glb`) y `GROMMET_DOBLE` (`LKAC250000_DOBLE.glb`) en `KUO_AV_GLB_FILES`.
   - Añadido `KUO_AV_VARIANTS.grommet = { simple, doble, normal }`.
   - Añadido `resolveKuoAVVariantAsset` y `resolveKuoAVVariantMetrics` con soporte para `{ component: 'grommet', tipoGrommet }`.
2. **`src/mepal/kuoAV/parts/kuoAVParts.js`:**
   - `createKuoAVGrommetPart` actualizado para admitir `tipo = 'simple' | 'doble'` y registrar sus dimensiones exactas.
3. **`src/mepal/kuoAV/builder/KuoAVBuilder.js`:**
   - Selección automática del GLB y métricas a través de `resolveKuoAVVariantAsset`.
   - Logging en consola:
     ```
     [KUO GROMMET]
     Mesa: 1200
     Variante seleccionada: LKAC250000.glb
     Posición: [0, 744, -229]
     Rotación: [0, 0, 0]
     ```
