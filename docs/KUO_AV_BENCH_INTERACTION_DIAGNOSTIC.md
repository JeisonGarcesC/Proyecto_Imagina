# Diagnóstico y Consolidación de Interacción Bench / Puesto Continuo en KUO AV

## 1. Causa Raíz
1. **Conflicto Vertical vs. Lateral**:
   - Anteriormente, la rutina de snap evaluaba las superficies de otras mesas (`isSurface` / `isKuoSurface`) y calculaba una elevación vertical $\text{snapY} = \text{targetTopY} + \text{assemblyBottomOffset}$ (elevando la mesa a $Y = 730\text{ mm}$, $1460\text{ mm}$, etc.) cuando dos escritorios se aproximaban en $(X, Z)$.
   - Para escritorios de trabajo (`KUO_AV_ASSEMBLY`), dos mesas próximas nunca deben apilarse verticalmente, sino unirse **horizontalmente en el suelo ($Y = 0$)** para conformar puestos de trabajo lineales o enfrentados (Bench).

---

## 2. Código Modificado

### [ThreeCanvas.jsx](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/src/components/ThreeCanvas.jsx)
- **`snapKuoAVAssembly(assembly)`**:
  - Garantiza `assembly.position.y = 0`.
  - Evalúa la cercanía horizontal con otros ensambles en escena (`KUO_AV_ASSEMBLY` o `KONCISA_PLUS_ASSEMBLY`).
  - Aplica traslación en $X$ y alineación en $Z$ para contacto perfecto de bordes sin interpenetración.
  - Guarda metadatos de relación:
    ```javascript
    assembly.userData.attachment = {
      targetAssemblyId,
      mode: 'BENCH_LATERAL',
      offsetLocal,
    };
    ```
- **`onPointerMove`**:
  - Mueve ensambles anclados (`attachment.mode === 'BENCH_LATERAL'`) en $(X, Z)$ acompañando a la mesa principal mientras permanecen nivelados en $Y = 0$.
- **`removePartObject`**:
  - Al suprimir la mesa principal, las mesas secundarias vinculadas liberan su `attachment` sin eliminarse, quedando como ensambles independientes en el suelo ($Y = 0$).

---

## 3. Algoritmo de Snap Lateral Bench

Dado el ensamble activo (`source`) y el ensamble destino (`target`):
1. Obtener cajas delimitadoras mundiales mediante `THREE.Box3`:
   $$\text{activeBox} = \text{Box3}(source), \quad \text{targetBox} = \text{Box3}(target)$$
2. **Snap Lateral Derecho (Source a la derecha de Target)**:
   $$\text{distRight} = |\text{activeBox.min.x} - \text{targetBox.max.x}| \le \text{SNAP\_THRESHOLD\_M}$$
   $$\Delta X = \text{targetBox.max.x} - \text{activeBox.min.x}, \quad \Delta Z = \text{targetBox.min.z} - \text{activeBox.min.z}$$
3. **Snap Lateral Izquierdo (Source a la izquierda de Target)**:
   $$\text{distLeft} = |\text{activeBox.max.x} - \text{targetBox.min.x}| \le \text{SNAP\_THRESHOLD\_M}$$
   $$\Delta X = \text{targetBox.min.x} - \text{activeBox.max.x}, \quad \Delta Z = \text{targetBox.min.z} - \text{activeBox.min.z}$$
4. **Snap Enfrentado en $Z$ (Frente a Frente)**:
   $$\text{distFront} = |\text{activeBox.min.z} - \text{targetBox.max.z}| \le \text{SNAP\_THRESHOLD\_M}$$
   $$\Delta X = \text{targetBox.min.x} - \text{activeBox.min.x}, \quad \Delta Z = \text{targetBox.max.z} - \text{activeBox.min.z}$$
5. Aplicar $\Delta$ y bloquear cota: $\text{position.y} = 0$.

---

## 4. Diferencia entre Snap Lateral y Snap sobre Superficie

| Característica | SNAP LATERAL BENCH (KUO AV $\to$ KUO AV) | SNAP SOBRE SUPERFICIE (Objeto $\to$ Superficie) |
| :--- | :--- | :--- |
| **Entidad Origen** | Ensamble de escritorio (`KUO_AV_ASSEMBLY`) | Accesorio / Pantalla / Elemento de apoyo |
| **Entidad Destino** | Otro ensamble de escritorio contiguo | Malla de superficie (`isSurface: true`, `kind: 'SURFACE'`) |
| **Cálculo en $Y$** | **Bloqueado en $Y = 0$** (nivel de piso) | $\text{targetBox.max.y} + \text{assemblyBottomOffset}$ |
| **Modo de Attachment** | `mode: 'BENCH_LATERAL'` | `mode: 'SURFACE_SNAP'` |
| **Eje de Ajuste** | $X$ (lateral) / $Z$ (enfrentado) | $Y$ (contacto vertical) |

---

## 5. Manejo de Attachments y Ciclo de Vida

- **Creación**: Cuando se completa el snap lateral, la mesa secundaria guarda el identificador de la mesa principal y el vector `offsetLocal = { x, y: 0, z }`.
- **Arrastre Sincronizado**: Al arrastrar la mesa principal, la secundaria actualiza su posición en cada frame:
  $$\text{position}_{secundaria} = (\text{position}_{principal}.x + \text{offsetLocal}.x, \, 0, \, \text{position}_{principal}.z + \text{offsetLocal}.z)$$
- **Desvinculación Segura**: Al eliminar la mesa principal, el hook `removePartObject` recorre `parts` y limpia `userData.attachment = null` en las mesas secundarias sin borrarlas.

---

## 6. Matriz de Pruebas Realizadas

| # | Prueba | Acción | Resultado |
| :--- | :--- | :--- | :---: |
| **1** | 1 KUO AV en escena. | Insertar y mover horizontalmente. | **PASS** — Permanece en $Y = 0$. |
| **2** | 2 KUO AV (Snap Derecho). | Mover mesa 2 cerca del costado derecho de mesa 1. | **PASS** — Borde izquierdo de mesa 2 contacta borde derecho de mesa 1 a $Y=0$. |
| **3** | 2 KUO AV (Snap Izquierdo). | Mover mesa 2 cerca del costado izquierdo de mesa 1. | **PASS** — Borde derecho de mesa 2 contacta borde izquierdo de mesa 1 a $Y=0$. |
| **4** | Movimiento Sincronizado. | Desplazar mesa 1 con mesa 2 unida. | **PASS** — Mesa 2 sigue a mesa 1 conservando el offset relativo exacto. |
| **5** | Selección Ascendente. | Clic en subpieza `KUAC650000`, `KUSO420000`, `LKAC250000`. | **PASS** — `getRootPartObject()` devuelve `KUO_AV_ASSEMBLY` y mueve el bloque entero. |
| **6** | Cambio Paramétrico (1200 $\to$ 1500). | Redimensionar mesa vinculada. | **PASS** — Carga variantes `_150.glb` y conserva alineación bench. |
| **7** | Cambio de Altura. | Ajustar altura del ensamble. | **PASS** — Superficie y patas se recalculan en $Y=0$. |
| **8** | Eliminación de Mesa Base. | Borrar mesa 1. | **PASS** — Mesa 2 no desaparece; queda independiente en $Y=0$. |
| **9** | Intento de Apilamiento. | Arrastrar mesa 2 sobre mesa 1. | **PASS** — No escala altura a $Y=730$; se interpreta como bench lateral en $Y=0$. |
| **10** | Compatibilidad con Superficies. | Objetos que requieren superficie receptora. | **PASS** — Arquitectura de `isSurface` y `dimMm` preservada intacta. |

---

## 7. Trazabilidad de Logs

```text
[KUO/KONCISA LATERAL SNAP]
sourceAssembly: KUOAV_002
targetAssembly: KUOAV_001
snapType: LATERAL_RIGHT
sourceBBox: min [600.0, 0.0, -300.0] max [1800.0, 730.0, 300.0]
targetBBox: min [-600.0, 0.0, -300.0] max [600.0, 730.0, 300.0]
finalPosition: [1200.0, 0.0, 0.0]

[KUO/KONCISA ATTACH]
source: KUOAV_002
target: KUOAV_001
mode: BENCH_LATERAL
offsetLocal: { x: 1200.0, y: 0.0, z: 0.0 }
```

---

## 8. Variantes GLB Físicas y Limitaciones Encontradas

- **Variantes Físicas en Carpeta**:
  - `KUSO420000_120.glb`, `KUSO420000_150.glb`, `KUSO420000_165.glb` (Vigas).
  - `KUSO860000_120.glb`, `KUSO860000_150.glb`, `KUSO860000_165.glb` (Ductos).
- **Tratamiento de 1800 mm**: No existe GLB físico de 1800 mm en la biblioteca oficial de KUO AV; la interfaz restringe las opciones válidas a 1200, 1500 y 1650 mm, manteniendo `scale = [1, 1, 1]`.
