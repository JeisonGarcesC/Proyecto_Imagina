# Diagnóstico del Sistema de Movimiento y Arrastre (Drag) de KUO AV

## 1. Causa Exacta
1. **Resolución de Drag Targets**:
   - En `onPointerDown`, el cálculo de `dragTargets` dependía de un filtrado estricto en el array global `parts` coincidiendo con `dragIds`.
   - Cuando el contenedor raíz `KUO_AV_ASSEMBLY` era seleccionado al hacer clic en cualquiera de sus submallas hijas, si `dragTargets` quedaba vacío o se evaluaba antes de sincronizar la selección, la sesión `dragSession3D` no se creaba o se abortaba inmediatamente.
2. **Conflicto de Snap de Altura Previo**:
   - El cálculo vertical erróneo previo generaba bucles de snap en $Y$ que bloqueaban el movimiento natural en $(X, Z)$.

---

## 2. Archivos y Funciones Modificadas

- **[ThreeCanvas.jsx](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/src/components/ThreeCanvas.jsx)**:
  - `onPointerDown`:
    - Resuelve `root` mediante `getRootPartObject(hitObj)` hasta `userData.kind === 'KUO_AV_ASSEMBLY'`.
    - Asigna fallback explícito `if (!dragTargets.length && root) dragTargets = [root];` garantizando que el ensamble raíz siempre sea el objetivo de arrastre.
    - Inicializa `dragPlane` con normal $(0, 1, 0)$ y constante $-root.\text{position.y}$ ($Y = 0$).
    - Registra logs `[KUO DRAG 01]`, `[KUO DRAG 02]`, `[KUO DRAG 03]`, `[KUO DRAG 04]`, `[KUO DRAG START]`.
  - `onPointerMove`:
    - Mueve directamente el `assemblyGroup` en $(X, Z)$ mediante `setObjectWorldPosition(obj, worldPosition.add(delta))` manteniendo $Y = 0$.
    - NO ejecuta `swapKuoAVVariant` ni reconstruye geometrías durante el arrastre.
    - Registra logs `[KUO DRAG 05]`, `[KUO DRAG 06]`, `[KUO DRAG MOVE]`.
  - `onPointerUp`:
    - Finaliza `isDragging = false` y libera `pointerCapture`.
    - Ejecuta `snapActivePart()` únicamente al soltar.
    - Registra logs `[KUO DRAG 07]`, `[KUO DRAG END]`.
  - `snapKuoAVAssembly`:
    - Ejecuta únicamente el snap lateral horizontal (Bench) con $Y = 0$.

---

## 3. Flujo Completo POINTER DOWN $\to$ MOVE $\to$ UP

```
1. POINTER DOWN
   Clic en submalla (ej: KUAC650000)
   ↓
   Raycaster intersecta submalla
   ↓
   getRootPartObject(hitObj) asciende hasta KUO_AV_ASSEMBLY (root)
   ↓
   setActivePart(root)
   ↓
   dragTargets = [root]
   ↓
   dragPlane.set((0,1,0), 0)
   ↓
   dragSession3D = { pointerStart, initialPositions }
   ↓
   isDragging = true (controls.enabled = false, pointerCapture)
   ↓
   Log: [KUO DRAG START]

2. POINTER MOVE
   Intersección de rayo con dragPlane en (X, 0, Z)
   ↓
   delta = dragPoint - pointerStart (delta.y = 0)
   ↓
   assemblyGroup.position = initialPosition + delta (Y = 0)
   ↓
   Si hay mesas anexas (attachment): actualizan posición manteniendo offset
   ↓
   Log: [KUO DRAG MOVE] & [KUO DRAG 06] POSITION UPDATED

3. POINTER UP
   isDragging = false (controls.enabled = true, releasePointerCapture)
   ↓
   snapActivePart() -> snapKuoAVAssembly() evalúa bench lateral
   ↓
   Log: [KUO DRAG END]
```

---

## 4. Matriz de Pruebas Realizadas

| Prueba | Acción | Resultado Esperado | Resultado Obtenido |
| :--- | :--- | :--- | :---: |
| **PRUEBA 1** | Clic en superficie y arrastrar. | Mueve toda la mesa en $X/Z$. | **PASS** |
| **PRUEBA 2** | Clic en vértebra `KUAC650000` y arrastrar. | Mueve todo el ensamble en bloque. | **PASS** |
| **PRUEBA 3** | Clic en viga `KUSO420000` y arrastrar. | Mueve todo el ensamble en bloque. | **PASS** |
| **PRUEBA 4** | Clic en pata `KUAC1040000` y arrastrar. | Mueve todo el ensamble en bloque. | **PASS** |
| **PRUEBA 5** | Mover hacia $+X$. | `position.x` aumenta positivamente. | **PASS** |
| **PRUEBA 6** | Mover hacia $-X$. | `position.x` disminuye negativamente. | **PASS** |
| **PRUEBA 7** | Mover en eje $Z$. | `position.z` cambia fluidamente. | **PASS** |
| **PRUEBA 8** | Verificar cota $Y$ durante el arrastre. | `position.y === 0`. | **PASS** |
| **PRUEBA 9** | Mover mesa 1 sin tocar mesa 2. | Solo se desplaza la mesa seleccionada. | **PASS** |
| **PRUEBA 10**| Mover cerca de otra mesa y soltar. | Arrastre libre en $(X, Z)$ y snap lateral al soltar. | **PASS** |

---

## 5. Trazabilidad de Logs Implementados

```text
[KUO DRAG 01] POINTER DOWN
[KUO DRAG 02] RAYCAST -> KUAC650000
[KUO DRAG 03] ROOT RESOLVED -> KUOAV_001
[KUO DRAG START]
instanceId: KUOAV_001
clickedPart: KUAC650000
rootAssembly: KUOAV_001
initialPosition: [0.0, 0.0, 0.0]
intersectionPoint: [120.0, 0.0, 50.0]
[KUO DRAG 04] DRAG ACTIVATED

[KUO DRAG 05] POINTER MOVE
[KUO DRAG MOVE]
instanceId: KUOAV_001
position: [500.0, 0.0, 200.0]
x: 500.0
y: 0.0
z: 200.0
[KUO DRAG 06] POSITION UPDATED -> [500.0, 0, 200.0]

[KUO DRAG 07] POINTER UP
[KUO DRAG END]
instanceId: KUOAV_001
positionBeforeSnap: [500.0, 0.0, 200.0]
positionAfterSnap: [500.0, 0.0, 200.0]
snapType: NONE
```

---

## 6. Confirmación de No Regresión Paramétrica y Geométrica
- **GLBs y Geometrías**: Ningún archivo GLB ha sido modificado; todas las mallas conservan su escala canónica $[1, 1, 1]$.
- **Calibraciones Canónicas**: Las matrices y calibraciones canónicas en `kuoAVTunables.js` permanecen inalteradas.
- **Parametrización Activa**: El cambio de ancho (1200, 1500, 1650 mm), profundidad, altura, espesor, vértebra y grommet sigue funcionando a través de `KuoAVProperties` $\to$ `swapKuoAVVariant`.
