# Auditoría de Arquitectura de Interacción: Koncisa Plus vs KUO AV

## 1. Resumen Ejecutivo
Esta auditoría analiza la arquitectura de ensambles, selección, movimiento, superficies, relaciones jerárquicas y contacto en **Koncisa Plus** (`src/mepal/koncisaPlus/`) y en el núcleo de Three.js ([ThreeCanvas.jsx](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/src/components/ThreeCanvas.jsx)), con el objetivo de reutilizar exactamente el mismo modelo en **KUO AV**.

---

## 2. Cómo Gestiona Koncisa Plus sus Ensambles y Movimiento

### A) Objeto Raíz y Estructura Jerárquica
En Koncisa Plus ([createKoncisaPlusInstance.js](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/src/mepal/koncisaPlus/factories/createKoncisaPlusInstance.js) y `createKoncisaPlusAssemblyGroup`):
1. **Contenedor Principal**: Es un `THREE.Group` agregado a la escena con los metadatos:
   - `kind: 'KONCISA_PLUS_ASSEMBLY'`
   - `type: 'koncisa-plus'`
   - `isPartRoot: true`
   - `groupId: <ID_ÚNICO>`
   - `instanceId: <ID_ÚNICO>`
   - `config: <CONFIG_RECIPE>`
2. **Subcomponentes**: Superficies, costados, vigas, ductos, pedestales y pantallas son hijos del grupo raíz (`puestoGroup.add(child)`) o registran `parentAssemblyId: puestoGroup.userData.groupId`.
3. **Mallas Internas (Meshes)**: Cada subpieza tiene `userData.isSubPart = true` y mantiene sus transformaciones relativas locales.

### B) Resolución de Selección
Cuando el usuario hace clic sobre cualquier submalla en el canvas:
- `getRootPartObject(hitObj)` asciende por el árbol de nodos (`cur.parent`). Al detectar `kind === 'KONCISA_PLUS_ASSEMBLY'` o `kind === 'KUO_AV_ASSEMBLY'`, retorna el grupo contenedor raíz.
- `resolveSelectionTargets(hitObj)` utiliza `getKoncisaAssemblyObject(hitObj)` para encontrar el `instanceId` del ensamble y seleccionar todos sus miembros asociados.

### C) Arrastre y Movimiento
- En `onPointerDown`, el objetivo de arrastre `dragTargets` es el `assemblyGroup` raíz.
- En `onPointerMove`, el raycast proyecta sobre el plano horizontal `dragPlane` ($Y$ constante) y aplica `delta` a la posición del contenedor raíz `assemblyGroup.position`.
- Como todos los componentes (superficie, costados, vigas, ductos, accesorios) son hijos directos del grupo raíz, **se desplazan rígidamente en bloque sin sufrir deformaciones ni recálculos geométricos individuales**.

---

## 3. Arquitectura de Superficies (`createSurfaceMesh` / `addSurface`)

En Koncisa Plus y en el núcleo de Imagina:
1. `createSurfaceMesh({ widthM, depthM, thicknessM })`: Genera una geometría `THREE.BoxGeometry(widthM, thicknessM, depthM)` con pivote central y `userData.dim = { widthM, depthM, thicknessM }`.
2. `addSurface`: Envuelve el mesh en un grupo con:
   - `userData.kind = 'SURFACE'`
   - `userData.isSurface = true`
   - `userData.dimMm = { widthMm, depthMm, thickMm }`
   - `userData.parentAssemblyId = parentGroup.userData.instanceId`
3. **Cálculo de la Cara Superior de la Superficie Receptora**:
   $$\text{surfaceTopWorldY} = \text{Box3}(surfaceObj).\text{max.y}$$
   Esto entrega la altura real exacta de apoyo en metros, independientemente de la elevación o espesor de la tapa.

---

## 4. Matriz Comparativa: Koncisa Plus vs KUO AV

| Funcionalidad | Koncisa Plus | KUO AV (Objetivo Reutilizado) | Estrategia de Reutilización |
| :--- | :--- | :--- | :--- |
| **Contenedor Raíz** | `THREE.Group` con `kind: 'KONCISA_PLUS_ASSEMBLY'`, `isPartRoot: true` | `THREE.Group` con `kind: 'KUO_AV_ASSEMBLY'`, `isPartRoot: true` | Mismo contenedor raíz con `instanceId` unívoco. |
| **Resolución Selección** | `getRootPartObject` escala hasta el assembly raíz al tocar cualquier hijo | `getRootPartObject` escala hasta `KUO_AV_ASSEMBLY` | Reutilizar `getRootPartObject` existente. |
| **Arrastre (Drag)** | Mueve `assemblyGroup.position` en $(X, Z)$ preservando offsets locales | Mueve `assemblyGroup.position` en $(X, Z)$ | Mismo flujo de `onPointerMove` sin mover piezas sueltas. |
| **Superficie Receptora** | `userData.kind = 'SURFACE'`, `isSurface = true`, `dimMm` | `userData.kind = 'KUO_AV_SURFACE'`, `isSurface = true`, `dimMm` | Mismos metadatos para detección por Raycast/Box3. |
| **Cálculo de Altura** | `Box3(targetSurface).max.y` + `assemblyBottomOffset` | `Box3(targetSurface).max.y` + `assemblyBottomOffset` | Mismo cálculo geométrico por Bounding Box real. |
| **Restricción Espacio** | Verifica si las dimensiones caben sobre la superficie receptora | Verifica $\text{ancho/fondo} \le \text{superficie} + 50\text{ mm}$ | Reutilizar regla estricta de compatibilidad dimensional. |
| **Attachment Relacional** | `userData.attachment = { targetAssemblyId, mode, offsetLocal }` | `userData.attachment = { targetAssemblyId, mode, offsetLocal }` | Vinculación por metadata sin crear ciclos de padres. |
| **Seguimiento al Mover** | Elementos vinculados se desplazan con su soporte receptor | Elementos vinculados siguen al ensamble base | Sincronización en `onPointerMove`. |
| **Desvinculación** | Al eliminar soporte, los objetos se desvinculan sin borrarse | Al eliminar soporte, se limpian los attachments | Mismo hook en `removePartObject`. |

---

## 5. Diagnóstico del Problema de la Altura y Solución Exacta

### Causa Raíz
Cuando una KUO AV arrastrada se suelta sobre el suelo o sobre otra superficie:
- El pivote del ensamble está en $Y=0$ (nivel del suelo).
- La base real de las patas tiene cota inferior $Y=0$.
- La cara superior de la superficie receptora está a $Y = \text{surfaceTopY}$.
- Para que la base del ensamble apoye en contacto perfecto sobre la superficie receptora sin flotar:
  $$\text{snapY} = \text{surfaceTopWorldY} + (assembly.\text{position.y} - \text{activeBox.min.y})$$
  Si el ensamble está en el suelo (sin superficie receptora válida debajo), su posición debe permanecer exactamente en $Y=0$.

---

## 6. Plan de Acción y Validación

1. Mantener `createKuoAVInstance` con la estructura de ensamble idéntica a Koncisa Plus.
2. Asegurar que `snapKuoAVAssembly` utilice `Box3` y la lógica unificada de superficies.
3. Ejecutar suite de pruebas:
   - Prueba 1: Mover una mesa de forma aislada.
   - Prueba 2: Mover dos mesas independientes.
   - Prueba 3: Snap de KUO AV #2 sobre KUO AV #1 (apoyo exacto en la cara superior).
   - Prueba 4: Rechazo de snap si la mesa es más ancha que la superficie (1500 mm sobre 1200 mm).
   - Prueba 5: Seguimiento dinámico de la mesa apoyada cuando se mueve la mesa base.
   - Prueba 6: Selección de subpiezas (vértebra, costados, viga, grommet) resolviendo siempre el ensamble completo.
