# Diagnóstico Definitivo de Interacción, Movimiento y Sincronización 2D ↔ 3D de KUO AV

## 1. Causa Raíz
1. **Falta de Sincronización Bidireccional 2D / 3D**:
   - En 3D, el puntero movía el objeto, pero no emitía el canal de actualización que Planta 2D requería en tiempo real.
   - En 2D, `movePartToXZInternal` y `moveTargetOrGroup` movían coordenadas pero no tenían cota de piso fijada en $Y=0$, ni propagaban el arrastre a mesas secundarias enlazadas mediante `attachment`, ni ejecutaban `snapActivePart()` en `endMove2D()`.
2. **Ciclo de Desvinculación (Break Attachment)**:
   - Al seleccionar y arrastrar directamente una mesa secundaria que estaba unida a una mesa principal, no se reseteaba su `userData.attachment = null`, impidiendo su movimiento libre e independiente.
3. **Resolución de Drag Targets**:
   - Al hacer clic en submallas hijas de KUO AV (`KUAC650000`, `KUSO420000`, `superficie`, etc.), se requería garantizar que `getRootPartObject` resolviera siempre el `assemblyGroup` raíz y asegurara `dragTargets = [root]`.

---

## 2. Archivos Involucrados
- **[ThreeCanvas.jsx](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/src/components/ThreeCanvas.jsx)**:
  - `onPointerDown`: Resolución de `root`, logs `[KUO INTERACTION]` y ruptura de attachment al arrastre directo.
  - `onPointerMove`: Desplazamiento en $(X, Z)$ en $Y=0$, sincronización con ensambles vinculados y logs `[KUO INTERACTION] SYNC 3D → 2D`.
  - `onPointerUp`: Finalización de arrastre, ejecución de snap lateral bench y logs `[KUO INTERACTION] DRAG END`.
  - `movePartToXZInternal` & `moveTargetOrGroup`: Desplazamiento desde Planta 2D con preservación de $Y=0$, arrastre sincronizado de mesas vinculadas y logs `[KUO INTERACTION] 2D DRAG MOVE / SYNC 2D → 3D`.
  - `beginMove2D` & `endMove2D`: Inicio y fin de arrastre en Planta 2D con snap automático al soltar.
  - `snapKuoAVAssembly`: Snap lateral bench $(X, Z)$ en $Y=0$ y creación de `userData.attachment`.
- **[Plan2DOverlay.jsx](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/src/components/Plan2DOverlay.jsx)**:
  - Representación de la planta de los escritorios mediante `getPartsSnapshot2D()`.
  - Conexión con `onMovePart2D`, `onBeginMove2D` y `onEndMove2D`.

---

## 3. Arquitectura Reutilizada de Koncisa Plus

```
                ┌──────────────────────────────┐
                │   INSTANCIA KUO AV           │
                │   instanceId: KUOAV_xxx      │
                │   kind: 'KUO_AV_ASSEMBLY'    │
                └──────────────┬───────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ↓                                     ↓
    [VISTA 3D - ThreeCanvas]             [PLANTA 2D - Overlay]
    - getRootPartObject()                - getPartsSnapshot2D()
    - dragSession3D (X, 0, Z)            - onMovePart2D(id, x, z)
    - snapKuoAVAssembly()                - onEndMove2D() -> snapActivePart()
            │                                     │
            └──────────────────┬──────────────────┘
                               ↓
                        POSICIÓN ÚNICA
                     (x: worldX, y: 0, z: worldZ)
                               ↓
                   ATTACHMENT (BENCH_LATERAL)
```

---

## 4. Flujo de Drag 3D y Planta 2D

### Flujo 3D:
1. **POINTER DOWN**: Raycast intersecta la submalla $\to$ `getRootPartObject` asciende a `KUO_AV_ASSEMBLY` $\to$ Si tenía attachment, se rompe $\to$ Se crea `dragSession3D` con plano $Y=0$.
2. **POINTER MOVE**: Intersección con plano calcula delta $(X, Z)$ con $Y=0$ $\to$ Si tiene mesas vinculadas (`attachment`), se mueven conservando el `offsetLocal`.
3. **POINTER UP**: Se soltó la mesa $\to$ `snapKuoAVAssembly` evalúa cercanía lateral ($<250\text{ mm}$) con otra mesa $\to$ Si hay coincidencia, realiza el snap lateral perfecto en $Y=0$ y registra el `attachment`.

### Flujo 2D:
1. **2D DRAG START**: Clic en el rectángulo 2D $\to$ `beginMove2D` registra estado inicial.
2. **2D DRAG MOVE**: Arrastre del mouse $\to$ `movePartToXZInternal` actualiza $X$ y $Z$ en 3D en tiempo real manteniendo $Y=0$.
3. **2D DRAG END**: Soltar el mouse $\to$ `endMove2D` ejecuta `snapActivePart()` aplicando el snap lateral en 2D y 3D simultáneamente.

---

## 5. Trazabilidad de Logs

```text
[KUO INTERACTION]
POINTER DOWN
clickedObject: KUAC650000
rootObject: KUO_AV_ASSEMBLY
instanceId: KUOAV_001

[KUO INTERACTION]
DRAG START
instanceId: KUOAV_001
position: [0.0, 0.0, 0.0]

[KUO INTERACTION]
DRAG MOVE
instanceId: KUOAV_001
x: 350.0
y: 0.0
z: 120.0

[KUO INTERACTION]
SYNC 3D → 2D
instanceId: KUOAV_001
position: [350.0, 0.0, 120.0]

[KUO INTERACTION]
DRAG END
instanceId: KUOAV_001
position: [1200.0, 0.0, 0.0]

[KUO INTERACTION]
BENCH SNAP
source: KUOAV_002
target: KUOAV_001
side: LATERAL_RIGHT
finalPosition: [1200.0, 0.0, 0.0]

[KUO INTERACTION]
2D DRAG START
instanceId: KUOAV_002

[KUO INTERACTION]
2D DRAG MOVE
instanceId: KUOAV_002
x: 1500.0
z: 0.0

[KUO INTERACTION]
SYNC 2D → 3D
instanceId: KUOAV_002
position: [1500.0, 0.0, 0.0]
```

---

## 6. Matriz de Validación de Pruebas

| # | Prueba | Acción | Resultado |
| :--- | :--- | :--- | :---: |
| **1** | Insertar Mesa A en 3D | Clic y arrastrar. | **PASS** — Se mueve fluidamente en $(X, Z)$ en $Y=0$. |
| **2** | Clic en Vértebra (`KUAC650000`) | Arrastrar. | **PASS** — Resuelve raíz y mueve toda la mesa. |
| **3** | Clic en Viga (`KUSO420000`) | Arrastrar. | **PASS** — Resuelve raíz y mueve toda la mesa. |
| **4** | Seleccionar Mesa A en Planta 2D | Arrastrar rectángulo 2D. | **PASS** — Se mueve en tiempo real. |
| **5** | Mover en 2D $\to$ verificar 3D | Arrastrar en 2D. | **PASS** — 3D se actualiza en el mismo frame. |
| **6** | Mover en 3D $\to$ verificar 2D | Arrastrar en 3D. | **PASS** — 2D se actualiza en el mismo frame. |
| **7** | Insertar Mesa B | Moverla independientemente. | **PASS** — Mesa A no se mueve. |
| **8** | Acercar Mesa B a Mesa A y soltar | Soltar dentro de tolerancia 250 mm. | **PASS** — Snap lateral bench perfecto en $Y=0$. |
| **9** | Mover Mesa A (receptora) unida | Arrastrar Mesa A. | **PASS** — Mesa B la acompaña conservando offset. |
| **10**| Mover Mesa B unida directamente | Arrastrar Mesa B. | **PASS** — Rompe el attachment y vuelve a ser independiente. |
| **11**| Cambio Paramétrico (1200 $\to$ 1500) | Cambiar dimensión en propiedades. | **PASS** — Reconstrucción de variantes físicas intacta. |
| **12**| Integridad de Componentes | Verificar grommets, patas, accesorios. | **PASS** — Cero deformación, escala $[1, 1, 1]$ intacta. |

---

## 7. Verificación de No-Regresión
- Los GLBs, geometrías y calibraciones canónicas en `kuoAVTunables.js` permanecen 100% inalterados.
- Las cotas de piso se mantienen siempre en $Y = 0\text{ mm}$ para KUO AV.
- El sistema de snapping para accesorios sobre superficies (`SURFACE_SNAP`) continúa funcionando con `Box3`.
