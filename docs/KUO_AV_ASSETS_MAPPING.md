# Mapeo y Estado de Integración de Assets CET: KUO AV - Superficie Perimetral

---

## 1. Estado de Integración

Se han integrado en el código los modelos GLB reales disponibles en `public/assets/models/Kuo AV/`, vinculados a través de `kuoAVTunables.js`, `kuoAVParts.js`, `KuoAVBuilder.js` y `createKuoAVInstance.js`.

---

## 2. Matriz Detallada de Componentes Integrados

| Código CET | Descripción Oficial | Archivo GLB | Ruta en Proyecto | Lado / Orientación | Tipo / Renderizado | Estado de Integración | Observaciones |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **LKSU010010** | Superficie perimetral Kuo AV | *Sin GLB (Procedural)* | `src/factories/surfaceFactory.js` | Simétrico | Paramétrico Three.js | **Integrado** | Renderizada con `createSurfaceMesh()`. Soporta espesores $18$, $25$ y $30\text{ mm}$ de forma continua. |
| **KUSO800000** (IZQ) | Costado terminal motorizado con base izquierdo | `KUSO800000_IZQ.glb` | `/assets/models/Kuo AV/KUSO800000_IZQ.glb` | Izquierdo (`side: 'left'`) | GLB Real | **Integrado** | Cargado con escala $(1,1,1)$ y rotación $(0,0,0)$. |
| **KUSO800000** (DER) | Costado terminal motorizado con base derecho | `KUSO800000_DER.glb` | `/assets/models/Kuo AV/KUSO800000_DER.glb` | Derecho (`side: 'right'`) | GLB Real | **Integrado** | Cargado con escala $(1,1,1)$ y rotación $(0,0,0)$ sin espejar. |
| **KUSO420000** | Viga soporte de superficie | `KUSO420000_150.glb` | `/assets/models/Kuo AV/KUSO420000_150.glb` | Central | GLB Real | **Integrado** | Cargado como modelo base (ancho 150) sin deformar en $X$. |
| **KUAC1040000** | Kit fuente alimentación | `KUAC1040000_74.glb` | `/assets/models/Kuo AV/KUAC1040000_74.glb` | Central / Izq | GLB Real | **Integrado** | Módulo de electrificación cargado como pieza independiente. |
| **KUAC680000** | Kit soporte tomas | `KUAC680000.glb` | `/assets/models/Kuo AV/KUAC680000.glb` | Central | GLB Real | **Integrado** | Soporte metálico complementario cargado como componente separado. |
| **LKAC250000** | Grommet aluminio 4 tomas | `LKAC250000.glb` | `/assets/models/Kuo AV/LKAC250000.glb` | Central posterior | GLB Real | **Integrado** | Pasatapas oficial de 4 tomas ubicado en el borde posterior. |
| **KUSO860000** | Ducto cableado | `KUSO860000_165.glb` | `/assets/models/Kuo AV/KUSO860000_165.glb` | Longitudinal | GLB Real | **Integrado** | Ducto horizontal cargado bajo viga sin distorsión no uniforme. |
| **KUAC650000** | Vértebra metálica altura variable | `KUAC650000.glb` | `/assets/models/Kuo AV/KUAC650000.glb` | Lateral (`izq` / `der`) | GLB Real | **Integrado** | Cargado como GLB fijo en piso ($Y=0$) sin `scale.y` automático. |
| **DPBK06** | Botonera LINAK de control | *Sin GLB* | `N/A` | Frontal derecho | Lógico / BOM Only | **Integrado** | Se incluye en `kuoAVParts` para desglose en BOM sin generar mallas 3D ni proxies. |

---

## 3. Puntos Pendientes para Pasos Posteriores de Validación Geométrica

1. **Viga Soporte Extensible (`KUSO420000`):**
   - Actualmente se carga el modelo nominal $150$. Se debe validar con ingeniería si para mesas de $1200$, $1400$, $1600$ o $1800\text{ mm}$ existen GLBs específicos por medida o si se usará una viga procedural telescópica central.
2. **Ducto Cableado (`KUSO860000`):**
   - Se carga el modelo nominal $165$. Pendiente de validar si varía según el ancho de la mesa.
3. **Escalamiento de Vértebra (`KUAC650000`):**
   - Se mantiene con escala $(1,1,1)$ en el piso. Tras validar visualmente el origen del modelo, se definirá si se aplica escala en $Y$ o segmentación por eslabones durante la elevación de la mesa.
4. **Múltiples Grommets (`LKAC250000`):**
   - Actualmente se coloca 1 grommet centrado en borde posterior. Pendiente confirmar si a partir de $1600\text{ mm}$ de ancho se deben colocar 2 grommets equidistantes.
