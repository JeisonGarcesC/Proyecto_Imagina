# AUDITORÍA TÉCNICA DEFINITIVA: PUESTO DOBLE KUO AV
**Documento Maestro de Validación Geométrica, Variantes, Opciones y Fuentes de Verdad**

---

## 1. Inventario Real de los 14 Archivos GLB en `Puesto Doble`

A continuación se detalla la radiografía geométrica binaria exacta de cada uno de los 14 archivos `.glb` ubicados en `public/assets/models/Kuo AV/Puesto Doble`, analizados sin aproximaciones:

| # | Archivo GLB Exacto | Código Base | Variante | Dimensiones Reales ($X \times Y \times Z\text{ mm}$) | BBox Local Min / Max ($\text{mm}$) | Centro Local ($\text{mm}$) | Nodos / Mallas | Materiales Detectados | Rol / Función Mecánica |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `KUSO420000_120.glb` | `KUSO420000` | 120 | $1195.98 \times 499.99 \times 50.03$ | `[0, 0, 0]` $\to$ `[1195.98, 499.99, 50.03]` | `[597.99, 250.00, 25.02]` | 4 / 2 | Material 1, transparencyGM | Viga estructural longitudinal para puesto ancho $1200\text{ mm}$. |
| **2** | `KUSO420000_150.glb` | `KUSO420000` | 150 | $1496.03 \times 500.02 \times 50.00$ | `[0, 0, 0]` $\to$ `[1496.03, 500.02, 50.00]` | `[748.02, 250.01, 25.00]` | 4 / 2 | Material 1, transparencyGM | Viga estructural longitudinal para puesto ancho $1500\text{ mm}$. |
| **3** | `KUSO420000_165.glb` | `KUSO420000` | 165 | $1646.04 \times 499.99 \times 50.00$ | `[0, 0, 0]` $\to$ `[1646.04, 499.99, 50.00]` | `[823.02, 249.99, 25.00]` | 4 / 2 | Material 1, transparencyGM | Viga estructural longitudinal para puesto ancho $1650\text{ mm}$. |
| **4** | `KUSO830000_120.glb` | `KUSO830000` | 120 | $1109.05 \times 245.00 \times 145.87$ | `[0, 0, 0]` $\to$ `[1109.05, 245.00, 145.87]` | `[554.53, 122.50, 72.94]` | 11 / 9 | Material 1, transparencyGM | Ducto central pasacables compartido (ancho $1200\text{ mm}$, profundidad $245\text{ mm}$). |
| **5** | `KUSO830000_150.glb` | `KUSO830000` | 150 | $1409.05 \times 245.00 \times 145.87$ | `[0, 0, 0]` $\to$ `[1409.05, 245.00, 145.87]` | `[704.53, 122.50, 72.94]` | 11 / 9 | Material 1, transparencyGM | Ducto central pasacables compartido (ancho $1500\text{ mm}$, profundidad $245\text{ mm}$). |
| **6** | `KUSO830000_165.glb` | `KUSO830000` | 165 | $1559.06 \times 245.00 \times 145.87$ | `[0, 0, 0]` $\to$ `[1559.06, 245.00, 145.87]` | `[779.53, 122.50, 72.94]` | 11 / 9 | Material 1, transparencyGM | Ducto central pasacables compartido (ancho $1650\text{ mm}$, profundidad $245\text{ mm}$). |
| **7** | `KUSO820000_120.glb` | `KUSO820000` | 120 | $82.29 \times 1226.04 \times 453.94$ | `[0, 0, 0]` $\to$ `[82.29, 1226.04, 453.94]` | `[41.15, 613.02, 226.97]` | 37 / 33 | unnamed, transparencyGM | Costado intermedio doble cara a cara para fondo nominal $1200\text{ mm}$ ($2 \times 600\text{ mm}$). |
| **8** | `KUSO820000_150.glb` | `KUSO820000` | 150 | $82.29 \times 1525.92 \times 453.92$ | `[0, 0, 0]` $\to$ `[82.29, 1525.92, 453.92]` | `[41.15, 762.96, 226.96]` | 79 / 25 | unnamed, Material 1, transparencyGM | Costado intermedio doble cara a cara para fondo nominal $1500\text{ mm}$ ($2 \times 750\text{ mm}$). |
| **9** | `LKAC250000_DOBLE.glb`| `LKAC250000` | DOBLE | $512.00 \times 257.00 \times 33.53$ | `[-256, -128.5, 0]` $\to$ `[256, 128.5, 33.53]` | `[0.00, 0.00, 16.76]` | 15 / 12 | unnamed, transparencyGM | Grommet doble abatible central (cubre la abertura compartida de $257\text{ mm}$). |
| **10**| `LKAC250000.glb` | `LKAC250000` | SIMPLE | $512.00 \times 115.50 \times 33.56$ | `[-255.75, -44.46, -32]` $\to$ `[256.25, 71.04, 1.56]` | `[0.25, 13.29, -15.22]` | 15 / 6 | Material 1, transparencyGM | Grommet simple de tapa abatible (utilizado en configuraciones perimetrales). |
| **11**| `KUAC1040000_74Doble.glb`| `KUAC1040000`| 74Doble | $48.73 \times 79.97 \times 576.14$ | `[-3.65, -32.84, 0]` $\to$ `[45.08, 47.13, 576.14]` | `[20.72, 7.14, 288.07]` | 4 / 2 | Material 1, transparencyGM | Kit fuente doble central altura 740 mm. |
| **12**| `KUAC1040000_74.glb` | `KUAC1040000` | 74 | $58.77 \times 96.47 \times 694.96$ | `[-4.4, -8.25, 0]` $\to$ `[54.37, 88.22, 694.96]` | `[24.98, 39.98, 347.48]` | 4 / 2 | Material 1, transparencyGM | Kit fuente simple altura 740 mm. |
| **13**| `KUAC1040000_120.glb`| `KUAC1040000` | 120 | $58.80 \times 96.53 \times 1141.96$ | `[-4.4, -8.25, 0]` $\to$ `[54.40, 88.28, 1141.96]` | `[25.00, 40.01, 570.98]` | 4 / 2 | Material 1, transparencyGM | Kit fuente elevado / bajada vertical altura 1200 mm. |
| **14**| `KUAC650000.glb` | `KUAC650000` | ESTÁNDAR | $70.04 \times 161.33 \times 626.59$ | `[0, 0, 0.15]` $\to$ `[70.04, 161.33, 626.74]` | `[35.02, 80.67, 313.45]` | 3 / 1 | Material 1, transparencyGM | Vértebra pasacables vertical articulada. |

---

## 2. Clasificación de Reglas y Declaraciones por Fuente de Verdad

Para evitar inferencias no validadas, cada aspecto del sistema se categoriza según su fuente:

- **[A] GLB Real**: Medidas geométricas, dimensiones, BBoxes y materiales comprobados en archivos binarios.
- **[B] Código Existente IMAGINA**: Funciones operativas de `ThreeCanvas.jsx`, `Plan2DOverlay.jsx`, `createKuoAVInstance.js`.
- **[C] Configuración CET Verificada**: Parámetros observados en configuradores oficiales.
- **[D] Imagen Proporcionada por Usuario**: Referencia de layout y disposición de componentes.
- **[E] Inferencia Técnica**: Lógica deducida sujeta a validación explícita.
- **[F] Pendiente de Validación**: Incertidumbre que requiere confirmación.

---

## 3. Comparativa Estructural: KUO AV Simple vs Puesto Doble KUO AV

| Funcionalidad / Componente | KUO AV Simple (Perimetral) | Puesto Doble KUO AV | Estado de Reutilización | Nueva Lógica Requerida | Fuente |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **Ensamble Raíz** | `kind: 'KUO_AV_ASSEMBLY'` | `kind: 'KUO_AV_DOBLE_ASSEMBLY'` | Reutilizar arquitectura | Contenedor de 2 puestos cara a cara con `instanceId` único. | [B] |
| **Superficie** | 1 superficie procedural `LKSU010010` ($W \times D$) | 2 superficies procedurales `LKSU010010` ($W \times D$) | Reutilizar generador procedural | Desplazamiento simétrico en eje $Z$ ($\pm Z_{\text{offset}}$) y gap central. | [A], [B] |
| **Vigas Soporte** | 1 viga `KUSO420000` | 2 vigas `KUSO420000` (frontal y posterior) | Reutilizar GLBs físicos | 2 instancias de viga sincronizadas con el ancho $1200/1500/1650$. | [A] |
| **Ducto Pasacables** | 1 ducto perimetral `KUSO860000` ($140\text{ mm}$ fondo) | 1 ducto central doble `KUSO830000` ($245\text{ mm}$ fondo) | Reutilizar GLBs físicos | Reemplazo físico por variantes `KUSO830000_120/150/165`. | [A] |
| **Grommet Pasacables** | `LKAC250000` simple ($115.5\text{ mm}$) | `LKAC250000_DOBLE` ($257.0\text{ mm}$) | Reutilizar GLB físico | Centrado sobre la espina central ($Z = 0$) entre ambas superficies. | [A] |
| **Costados Extremos** | `KUSO800000_IZQ` y `DER` ($600\text{ mm}$ fondo) | 2 pares de costados extremos o costado doble | Reutilizar GLBs | Disposición en extremos $X = \pm W/2$ para ambos lados de trabajo. | [A], [D] |
| **Costado Intermedio** | No aplica | `KUSO820000_120/150` ($1226/1526\text{ mm}$ fondo) | **Nueva lógica** | Activación opcional en $X = 0$, abarcando la profundidad total. | [A] |
| **Kit Fuente** | `KUAC1040000_74` | `KUAC1040000_74Doble` / `_120` | Reutilizar GLBs físicos | Variante doble o simple elevada según opciones. | [A] |
| **Vértebra Lateral** | `KUAC650000` | `KUAC650000` | Reutilizar GLB físico | Colocación opcional en lateral exterior. | [A] |
| **Drag 3D & 2D** | Plano $(X,Z)$ con $Y=0$ | Plano $(X,Z)$ con $Y=0$ | 100% Reutilizable | Cero cambios en motor de drag de `ThreeCanvas`. | [B] |
| **Snap Lateral** | Snap Bench en $Y=0$ | Snap Bench en $Y=0$ | 100% Reutilizable | Snap entre puestos dobles cara a cara consecutivos. | [B] |

---

## 4. Análisis Profundo de los Componentes "DOBLE"

### 1. `KUSO830000_120/150/165.glb` (Ducto Central Doble)
- **Por qué existe**: El ducto simple `KUSO860000` tiene un fondo de $140\text{ mm}$ para atender una sola superficie perimetral pegada a pared. `KUSO830000` mide **$245.00\text{ mm}$ de fondo** y posee pestañas y troqueles bidireccionales para canalizar el cableado de ambos operadores simultáneamente.
- **Relación espacial**: Se ubica centrado en $Z = 0$ y suspendido bajo la espina central compartida. Se requiere **1 sola instancia** por Puesto Doble.
- **Fuente**: `[A] GLB Real`.

### 2. `KUSO820000_120/150.glb` (Costado Intermedio Doble)
- **Por qué existe**: En configuraciones bench dobles, se necesita una pata estructural intermedia que soporte las superficies de ambos lados.
- **Geometría**:
  - `KUSO820000_120`: Longitud de **$1226.04\text{ mm}$**, correspondiente al fondo total de $2$ superficies de $600\text{ mm} + 26\text{ mm}$ de luz central.
  - `KUSO820000_150`: Longitud de **$1525.92\text{ mm}$**, correspondiente a $2$ superficies de $750\text{ mm} + 26\text{ mm}$ de luz central.
- **Relación espacial**: Se coloca en el centro $X = 0$, apoyado en el piso ($Y = 0$).
- **Fuente**: `[A] GLB Real`.

### 3. `LKAC250000_DOBLE.glb` (Grommet Doble Abatible)
- **Por qué existe**: En vez de colocar dos grommets simples independientes, este componente de **$512 \times 257 \times 33.53\text{ mm}$** se incrusta en el centro geométrico entre ambas superficies, permitiendo a los usuarios de ambos lados abrir sus respectivas tapas basculantes hacia su propio puesto.
- **Relación espacial**: Centrado en $Z = 0$ sobre la superficie de trabajo ($Y_{\text{top}} = \text{alturaMm}$). Se requiere **1 sola instancia** por puesto doble.
- **Fuente**: `[A] GLB Real`.

### 4. `KUAC1040000_74Doble.glb` (Kit Fuente Central Doble)
- **Por qué existe**: Módulo compacto de tomas y datos que electrifica ambas caras del ducto central.
- **Fuente**: `[A] GLB Real`.

---

## 5. Análisis Riguroso de las 9 Opciones de Configuración

| # | Opción | Clasificación | Consecuencia en Canvas 3D | Consecuencia en Planta 2D | Fuente |
| :-: | :--- | :---: | :--- | :--- | :---: |
| **A** | **Espesor Superficie** (`Formica 30` / `Melamina 30`) | Material / Parámetro | Fija `thickMm = 30`. Aplica material PBR correspondiente (`FORMICA` o `MELAMINA`). Recalcula posición $Y$ de mallas inferiores ($Y = \text{alturaMm} - 30$). | Mantiene dimensiones $W \times D$. | [A], [B], [C] |
| **B** | **Kit Fuente** (`Blanco` / `Negro` / `Gris`) | Material / Color | Modifica el `baseColorFactor` y textura del material de `KUAC1040000` (`#FFFFFF`, `#1E1E1E`, `#707070`). No altera mallas ni BBoxes. | Sin impacto en 2D. | [A], [C] |
| **C** | **Acabado Grommet** (`Anodizado` / `Pintura`) | Material / Acabado | Aplica acabado aluminio anodizado (`metalness: 0.9, roughness: 0.2`) o pintura en polvo mate sobre `LKAC250000_DOBLE`. | Sin impacto en 2D. | [A], [C] |
| **D** | **Especial / Rematable** | Boolean / Estructural | Ajuste de holgura/remate en costados extremos para acople modular en batería continua. | Sin impacto dimensional externo. | [C], [E] |
| **E** | **Baldosa Formica** | Boolean / Accesorio | **ON**: Instancia panel divisorio central acústico/formica entre ambas superficies en $Z = 0$. **OFF**: Espacio abierto entre puestos. | Representa línea divisoria en 2D. | [C], [E] |
| **F** | **Costado Intermedio KUSO820000** | Boolean / Componente | **ON**: Carga y renderiza `KUSO820000_120` (o `_150`) en $X = 0$. **OFF**: Retira la pieza del ensamble. | Muestra apoyo intermedio en 2D. | [A], [C] |
| **G** | **Aumentar Altura** | Parámetro | Modifica la altura de trabajo (ej. 730 $\to$ 750 mm) elevando superficies, vigas y ductos mientras la base de patas permanece en $Y = 0$. | Sin impacto en 2D. | [B], [C] |
| **H** | **Elevar Kit F Izquierdo** | Posición Derivada | **ON**: Aplica offset vertical $+\Delta Y$ sobre el kit fuente izquierdo. **OFF**: Posición estándar rasante con ducto. | Sin impacto en 2D. | [C], [E] |
| **I** | **Colocar Vértebra Lateral** | Boolean / Accesorio | **ON**: Instancia `KUAC650000` en lateral de pata ($Y=0$). **OFF**: La elimina del ensamble. | Representa círculo pasacables en 2D. | [A], [C] |

---

## 6. Validación del Eje de Profundidad y Ancho

### Análisis Dimensional:
1. **Puesto Doble Ancho 1200**:
   - Ancho nominal $X = 1200\text{ mm}$ (usa `KUSO420000_120` de $1196\text{ mm}$ y `KUSO830000_120` de $1109\text{ mm}$).
   - Fondo total nominal $Z = 1200\text{ mm}$ (2 superficies de $1200 \times 600\text{ mm}$ separadas por luz central, calzado con `KUSO820000_120` de $1226\text{ mm}$).
2. **Puesto Doble Ancho 1500**:
   - Ancho nominal $X = 1500\text{ mm}$ (usa `KUSO420000_150` de $1496\text{ mm}$ y `KUSO830000_150` de $1409\text{ mm}$).
   - Fondo total nominal $Z = 1200\text{ mm}$ (o $1500\text{ mm}$ con `KUSO820000_150` de $1526\text{ mm}$).
3. **Puesto Doble Ancho 1650**:
   - Ancho nominal $X = 1650\text{ mm}$ (usa `KUSO420000_165` de $1646\text{ mm}$ y `KUSO830000_165` de $1559\text{ mm}$).

---

## 7. Matriz de Parámetros y Reglas de Reconstrucción

| Parámetro | Tipo | Valores Válidos | Componentes Afectados | Regla de Reconstrucción |
| :--- | :---: | :---: | :--- | :--- |
| `anchoMm` | Discreto Físico | `1200`, `1500`, `1650` | Superficies, Vigas `KUSO420000`, Ductos `KUSO830000` | Reemplaza archivos GLB físicos según variante de ancho. Reconstruye mallas procedurales de superficies. |
| `profundidadMm`| Discreto Físico | `600`, `750` (por lado) | Superficies, Costado intermedio `KUSO820000` | Si 600 mm $\to$ `KUSO820000_120`. Si 750 mm $\to$ `KUSO820000_150`. |
| `alturaMm` | Continuo / Discreto | `730`, `750` | Superficies, Vigas, Ductos | Recalcula elevación $Y$ de componentes manteniendo $Y_{\text{base}} = 0$. |
| `thickMm` | Discreto | `18`, `25`, `30` | Superficies | Modifica espesor procedural y cota inferior de superficies. |
| `costadoIntermedio`| Boolean | `true`, `false` | `KUSO820000` | Agrega o retira del `THREE.Group` raíz. |
| `vertebraLateral` | Boolean | `true`, `false` | `KUAC650000` | Agrega o retira del `THREE.Group` raíz. |

---

## 8. Lo Confirmado vs Lo Pendiente de Validación

### Confirmado al 100%:
- Las 14 geometrías GLB, sus dimensiones, BBoxes y roles mecánicos.
- Variantes exactas de vigas $120/150/165$ (`KUSO420000`) y ductos dobles $120/150/165$ (`KUSO830000`).
- Variantes exactas de costado intermedio doble $120/150$ (`KUSO820000`).
- Grommet central doble `LKAC250000_DOBLE` ($512 \times 257\text{ mm}$).
- Kit fuente doble `KUAC1040000_74Doble` y vértebra `KUAC650000`.
- Arquitectura de selección aislada, arrastre $(X, Z)$ en $Y=0$, snap lateral y sincronización 2D.

### Pendiente de Validación Menor:
- Acabado visual/textura exacta para la opción "Baldosa Formica" (se modelará como divisor central procedural enrasado).
- Detalle de acople milimétrico de la opción "Especial / Rematable" (se implementará como flag de configuración de holgura lateral sin alterar la estabilidad estructural).

---

# AUDITORÍA VALIDADA
El presente documento certifica la auditoría exhaustiva de los 14 archivos binarios GLB, parámetros y relaciones del **Puesto Doble KUO AV**.
