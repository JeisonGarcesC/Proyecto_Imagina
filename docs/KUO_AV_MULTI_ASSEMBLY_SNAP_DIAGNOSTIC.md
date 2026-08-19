# Diagnóstico de Multi-Ensambles, Arrastre y Snap / Pegado a Superficies — KUO AV

## 1. Arquitectura de Múltiples Instancias

Cada ensamble de **KUO AV** insertado en la escena opera como un objeto de nivel superior independiente:
- **`instanceId` Único**: Generado de forma unívoca para cada mesa insertada (`KUOAV_${Date.now()}_${random}` o ID explícito).
- **Contenedor Raíz**: Cada ensamble es un `THREE.Group` con `userData.kind = 'KUO_AV_ASSEMBLY'` y `userData.isPartRoot = true`.
- **Integridad de Selección y Arrastre**: Al hacer clic en cualquier subpieza o malla hija (viga, ducto, vértebra, columnas, etc.), la función `getRootPartObject` escala automáticamente hasta el `assemblyGroup` raíz, garantizando que el arrastre (`drag & drop`) y la selección muevan siempre el ensamble íntegro sin desarmar su geometría interna.

---

## 2. Detección de Superficies Receptoras y Snap de Contacto

### A) Identificación de Superficies
La superficie procedural de KUO AV (`LKSU010010`) está etiquetada explícitamente en su `userData`:
```javascript
userData.isSurface = true;
userData.isKuoSurface = true;
userData.kind = 'KUO_AV_SURFACE';
userData.surfaceWidthMm = 1200; // o ancho configurado
userData.surfaceDepthMm = 600;  // o fondo configurado
userData.parentAssemblyId = instanceId;
```

### B) Algoritmo de Snap y Validación Dimensional
Al soltar un ensamble (`onPointerUp`):
1. **Búsqueda de Candidatos**: Se recorren las superficies en escena descartando las pertenecientes al propio ensamble activo.
2. **Validación de Espacio (Requirement 14 / 21)**: Se compara el ancho y profundidad del ensamble contra la superficie receptora:
   $$\text{assemblyWidthMm} \le \text{targetWidthMm} + 50\text{ mm} \quad \text{y} \quad \text{assemblyDepthMm} \le \text{targetDepthMm} + 50\text{ mm}$$
   Si el ensamble no cabe (ej: mesa de 1500 mm sobre superficie de 1200 mm), el snap se cancela y la mesa queda a nivel de suelo.
3. **Cálculo de Contacto Vertical**:
   $$\text{snapY} = \text{surfaceTopWorldY} + \text{assemblyBottomOffset}$$
   donde $\text{assemblyBottomOffset} = \text{position.y} - \text{activeBox.min.y}$, garantizando apoyo físico 1:1 sin flotar ni penetrar la superficie.
4. **Metadata de Attachment (Requirement 15)**:
   ```javascript
   assembly.userData.attachment = {
     targetAssemblyId: 'KUOAV_001',
     targetSurfaceId: 'LKSU010010_UUID',
     mode: 'SURFACE_SNAP',
     offsetLocal: { x: deltaX, y: deltaY, z: deltaZ },
   };
   ```

---

## 3. Seguimiento y Desvinculación Dinámica

- **Seguimiento (Requirement 16)**: Cuando la mesa base receptora se mueve, en `onPointerMove` se actualizan automáticamente las coordenadas mundiales de todos los ensambles que tengan `attachment.targetAssemblyId === movingId`, conservando su `offsetLocal`.
- **Desvinculación al Eliminar (Requirement 17)**: Si la mesa base receptora es eliminada (`removePartObject`), los objetos apoyados sobre ella quedan libres en su posición mundial actual y su metadata `attachment` se limpia a `null` sin ser eliminados accidentalmente.

---

## 4. Resultados de Pruebas Validadas

| Prueba | Descripción | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :---: |
| **PRUEBA 1 (Req 20)** | Mesa 2 ($1200\text{ mm}$) colocada sobre Mesa 1 ($1200\text{ mm}$). | Snap exacto a $Y=730.0\text{ mm}$. Al mover Mesa 1, Mesa 2 sigue la superficie. | **PASS** |
| **PRUEBA 2 (Req 21)** | Mesa 3 ($1500\text{ mm}$) intentando colocarse sobre Mesa 1 ($1200\text{ mm}$). | Detecta que $1500 > 1200\text{ mm}$, no realiza snap, queda a $Y=0.0\text{ mm}$. | **PASS** |
| **PRUEBA 3 (Req 22)** | Inserción de 3 mesas ($1200$, $1500$, $1650\text{ mm}$). | 3 `instanceId` únicos, configuraciones y movimientos independientes. | **PASS** |

---

## 5. Trazabilidad de Logs Registrados

```text
[KUO DRAG]
assemblyId: KUOAV_001
position: [500.0, 0.0, 0.0]

[KUO SNAP]
sourceAssembly: KUOAV_002
targetAssembly: KUOAV_001
targetSurface: LKSU010010
surfaceTopY: 730.0
assemblyBottomY: 0.0
snapPosition: [0.0, 730.0, 0.0]

[KUO ATTACH]
source: KUOAV_002
target: KUOAV_001
mode: SURFACE_SNAP
```
