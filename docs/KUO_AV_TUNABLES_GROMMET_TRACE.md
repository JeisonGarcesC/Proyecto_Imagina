# Trazabilidad Definitiva: KUO_AV_CALIBRATION → KuoAVBuilder → Three.js (LKAC250000)

## 1. Cadena de Datos Unificada

Se auditó y corrigió el flujo completo para garantizar que `KUO_AV_CALIBRATION.grommet` sea la **única fuente de verdad**:

```
KUO_AV_CALIBRATION.grommet (posicionImaginaCanonicaMm / posicionMm + offsetMm)
        ↓
KuoAVBuilder.js (lectura directa y cálculo unificado)
        ↓
part.position { x: 0.00, y: 728.44, z: -229.08 }
        ↓
createKuoAVInstance.js (instanciación Three.js sin sobrescrituras)
        ↓
partObject.position.set(0.00, 0.72844, -0.22908)
```

---

## 2. Explicación Matemática del Pivot vs Centro

### 2.1 Datos Físicos del GLB (`LKAC250000.glb`)
- **Bounding Box Local en $Y$:**
  - $Y_{min} = -32.00\text{ mm}$ (base del canal pasatapas)
  - $Y_{max} = +1.56\text{ mm}$ (ala/pestaña superior sobre el origen $Y=0$)
  - Altura total: $33.56\text{ mm}$

### 2.2 Relación con la Superficie Procedural de IMAGINA
- **Superficie de IMAGINA:**
  - Cara Superior (Surface Top): $Y = 730.00\text{ mm}$
  - Cara Inferior (Surface Bottom): $Y = 700.00\text{ mm}$ (Espesor $30\text{ mm}$)
- **Cálculo Exacto de $Y$ Canónico:**
  - Para que la pestaña superior ($+1.56\text{ mm}$) quede enrasada exactamente con la cara superior de la mesa ($730.00\text{ mm}$):
    $$Y_{pos} = 730.00 - 1.56 = \mathbf{728.44\text{ mm}}$$
- **Bounding Box Resultante en el Mundo:**
  - $Y_{world\_max} = 728.44 + 1.56 = \mathbf{730.00\text{ mm}}$ (enrasado 100% con la superficie)
  - $Y_{world\_min} = 728.44 - 32.00 = \mathbf{696.44\text{ mm}}$ (penetra los $30\text{ mm}$ de la tapa y asienta en el soporte de tomas `KUAC680000`)

---

## 3. Trazabilidad de Valores por Etapa

| Etapa | Posición ($X, Y, Z$ mm) | Origen del Dato |
| :--- | :---: | :--- |
| **1. `KUO_AV_CALIBRATION.grommet`** | $[0.00, 728.44, -229.08]$ | `posicionImaginaCanonicaMm` en `kuoAVTunables.js` |
| **2. `KuoAVBuilder.js`** | $[0.00, 728.44, -229.08]$ | Leído directamente de `cal.grommet` + `offsetMm` |
| **3. `createKuoAVInstance.js`** | $[0.00, 728.44, -229.08]$ | Recibido en `part.position` |
| **4. Three.js (`partObject.position`)** | $[0.00, 728.44, -229.08]$ | Posición física en escena mundial |

---

## 4. Salida de Consola en Tiempo de Ejecución

```
[KUO GROMMET CALIBRATION] {
  tunablePosition: { x: 0, y: 728.44, z: -229.08 },
  tunableOffset: { x: 0, y: 0, z: 0 },
  finalPosition: { x: 0, y: 728.44, z: -229.08 }
}

[KUO LKAC250000 FINAL]
Position:
[0.00, 728.44, -229.08]
Rotation:
[0, 0, 0]
Scale:
[1, 1, 1]
Local BBox:
min [-255.75, -32.00, -71.04]
max [256.25, 1.56, 44.46]
World BBox:
min [-255.75, 696.44, -300.12]
max [256.25, 730.00, -184.62]
Dimensions:
512.00 x 33.56 x 115.50 mm
Surface Top:
730.00 mm
Surface Bottom:
700.00 mm
Embedding:
32.00 mm
Offset aplicado:
X = 0.00
Y = 0.00
Z = 0.00
```
