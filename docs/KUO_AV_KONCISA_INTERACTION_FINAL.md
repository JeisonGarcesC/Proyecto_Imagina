# Integración Final de Interacción Koncisa Plus $\leftrightarrow$ KUO AV

## 1. Mecanismos de Koncisa Plus Reutilizados
1. **Jerarquía Unificada de Ensambles (`assemblyGroup`)**:
   - `createKuoAVInstance` genera el contenedor `THREE.Group` con `userData.kind = 'KUO_AV_ASSEMBLY'` y `userData.isPartRoot = true`.
   - Todas las piezas hijas (superficie, costados, viga, ducto, vértebra, kit fuente, soporte tomas, grommet) se insertan dentro del grupo raíz y poseen `userData.isSubPart = true` con `userData.parentAssemblyId = instanceId`.
2. **Selección Ascendente (`getRootPartObject`)**:
   - Al pulsar cualquier submalla (ej: `KUAC650000`, `KUSO420000`, `LKAC250000`), el sistema asciende hasta el ensamble raíz.
   - La selección visual y el objetivo de movimiento corresponden siempre a la mesa completa.
3. **Detección de Superficies Receptores (`isSurface` / `isKuoSurface`)**:
   - Las superficies se identifican mediante `userData.isSurface = true` y sus dimensiones `dimMm` (`surfaceWidthMm`, `surfaceDepthMm`).
4. **Cálculo de Contacto Vertical por Bounding Box (`Box3`)**:
   - $\text{surfaceTopWorldY} = \text{Box3}(targetSurface).\text{max.y}$
   - $\text{assemblyBottomOffset} = assembly.\text{position.y} - \text{Box3}(assembly).\text{min.y}$
   - $\text{snapY} = \text{surfaceTopWorldY} + \text{assemblyBottomOffset}$
   - Si no hay superficie debajo o el ensamble está en el piso, $\text{position.y} = 0$.
5. **Relación de Attachment y Seguimiento**:
   - `userData.attachment = { targetAssemblyId, targetSurfaceId, mode: 'SURFACE_SNAP', offsetLocal }`.
   - En `onPointerMove`, los ensambles apoyados siguen a la mesa base.
   - En `removePartObject`, al borrar la mesa base, los ensambles apoyados quedan libres en el espacio sin eliminarse.

---

## 2. Archivos Modificados

1. [ThreeCanvas.jsx](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/src/components/ThreeCanvas.jsx):
   - `snapKuoAVAssembly` integrado en `snapActivePart` con cálculo de contacto exacto por `Box3`.
   - `onPointerMove`: seguimiento dinámico de ensambles vinculados y logs `[KUO/KONCISA DRAG]`.
   - `removePartObject`: desvinculación limpia de attachments.
2. [createKuoAVInstance.js](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/src/mepal/kuoAV/factory/createKuoAVInstance.js):
   - `instanceId` unívoco por defecto.
   - Metadatos de superficie receptora (`isSurface: true`, `isKuoSurface: true`, `kind: 'KUO_AV_SURFACE'`).
3. [KUO_AV_VS_KONCISA_INTERACTION_AUDIT.md](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/docs/KUO_AV_VS_KONCISA_INTERACTION_AUDIT.md):
   - Auditoría comparativa y análisis de arquitectura.

---

## 3. Matriz de Pruebas Realizadas

| Prueba | Condición Inicial | Acción | Resultado |
| :--- | :--- | :--- | :---: |
| **PRUEBA 1** | 1 KUO AV en escena. | Seleccionar $\to$ arrastrar $\to$ soltar. | Se mueve en bloque y apoya a $Y=0$. |
| **PRUEBA 2** | 2 KUO AV en escena. | Mover Mesa 1 sin tocar Mesa 2. | Mesa 2 conserva su posición independiente. |
| **PRUEBA 3** | Mesa 2 ($1200\text{ mm}$) sobre Mesa 1 ($1200\text{ mm}$). | Arrastrar y soltar sobre la superficie. | **Snap exacto**: Base de Mesa 2 queda apoyada sobre la tapa de Mesa 1 a $Y=730.0\text{ mm}$ sin flotar. |
| **PRUEBA 4** | Mesa 3 ($1500\text{ mm}$) sobre Mesa 1 ($1200\text{ mm}$). | Arrastrar sobre superficie más pequeña. | **Rechazo de snap**: Detecta que no cabe ($1500 > 1200$) y permanece a $Y=0$. |
| **PRUEBA 5** | Mesa 2 apoyada sobre Mesa 1. | Desplazar Mesa 1 en $+0.5\text{ m}$. | Mesa 2 sigue a Mesa 1 manteniendo su offset. |
| **PRUEBA 6** | Clic en subpieza `KUAC650000` o `KUSO420000`. | Iniciar arrastre. | Se desplaza el ensamble `KUO_AV_ASSEMBLY` completo. |

---

## 4. Trazabilidad de Logs

```text
[KUO/KONCISA DRAG]
assemblyId: KUOAV_001
position: [500.0, 0.0, 0.0]

[KUO/KONCISA SURFACE]
surfaceId: LKSU010010
surfacePosition: [0.0, 715.0, 0.0]
surfaceTop: 730.0

[KUO/KONCISA SNAP]
sourceAssembly: KUOAV_002
targetSurface: LKSU010010
contactPoint: [0.0, 730.0, 0.0]
finalPosition: [0.0, 730.0, 0.0]

[KUO/KONCISA ATTACH]
source: KUOAV_002
target: KUOAV_001
```
