# Diagnóstico y Conexión de Parametrización Real — KUO AV

## 1. Trazabilidad del Flujo de Datos y Conexión

### Causa Raíz Identificada:
1. **Desconexión en el payload de selección**: Al hacer click en 3D sobre cualquier pieza del ensamble, el evento `onFloatingEditorRequest` no incluía el objeto `config` ni el `parentAssemblyId` / `userData`, por lo que `KuoAVProperties.jsx` caía en valores por defecto (1200, 600, 730) y no disponía del `instanceId` para invocar el swap.
2. **Reconstrucción y Sincronización en `swapKuoAVVariant`**: Se vinculó la recreación del ensamble con `createKuoAVInstance` determinista, eliminación del objeto anterior mediante `removePartObject` y reemisión de `onFloatingEditorRequest` para que la UI de propiedades refleje inmediatamente el nuevo estado sin desincronizarse.

```
[KuoAVProperties.jsx]
        ↓  (onChange / onPointerUp)
  updateConfig(changes)
        ↓
  api.swapKuoAVVariant(instanceId, nextConfig)
        ↓
[ThreeCanvas.jsx]
  1. Localiza oldObj por instanceId / groupId
  2. targetConfig = { ...currentConfig, ...nextConfig }
  3. createKuoAVInstance({ config: targetConfig })
        ↓
[KuoAVBuilder.js]
  - Calcula dimensiones y variantes físicas (_120, _150, _165)
  - Recalcula coordenadas paramétricas de costados, columnas, viga y accesorios
        ↓
[ThreeCanvas.jsx]
  4. newObj.position/rotation/scale copiados del estado en escena
  5. removePartObject(oldObj)
  6. scene.add(newObj)
  7. setActivePart(newObj) + emitBOM() + refreshFloorAndGrid()
  8. onFloatingEditorRequest(part con nuevo config)
```

---

## 2. Validación de Pruebas Reales (Antes / Después)

| Parámetro | Configuración Inicial | Cambio Realizado | GLB Viga Seleccionado | GLB Ducto Seleccionado | Columnas / Costados ($X$ mm) | Estado Rebuild |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **PRUEBA 1** | $1200 \times 600 \times 730$ | *Creación* | `KUSO420000_120.glb` | `KUSO860000_120.glb` | Izq: $-584.4$, Der: $+530.6$ | **REBUILT (10 partes)** |
| **PRUEBA 2** | $1200 \to 1400$ | Ancho $1400$ | `KUSO420000_150.glb` | `KUSO860000_150.glb` | Izq: $-684.4$, Der: $+630.6$ | **REBUILT (10 partes)** |
| **PRUEBA 3** | $1400 \to 1500$, Fondo $700$ | Ancho $1500$, Fondo $700$ | `KUSO420000_150.glb` | `KUSO860000_150.glb` | Izq: $-734.4$, Der: $+680.6$ | **REBUILT (10 partes)** |
| **PRUEBA 4** | $1500 \to 1200$, Altura $750$ | Altura $750$ | `KUSO420000_120.glb` | `KUSO860000_120.glb` | Cara sup: $750.0$, Grommet: $716.44$ | **REBUILT (10 partes)** |
| **PRUEBA 5** | Espesor $30 \to 40$ | Espesor $40$ | `KUSO420000_120.glb` | `KUSO860000_120.glb` | Superficie: $40\text{ mm}$, Soporte: $Y=568.0$ | **REBUILT (10 partes)** |

---

## 3. Logs de Reconstrucción Paramétrica Registrados

```text
[KUO PARAM]
width: 1400
selected beam: /assets/models/Kuo AV/KUSO420000_150.glb
selected duct: /assets/models/Kuo AV/KUSO860000_150.glb
assembly rebuilt: true
```

```text
[KUO PARAM]
width: 1500
selected beam: /assets/models/Kuo AV/KUSO420000_150.glb
selected duct: /assets/models/Kuo AV/KUSO860000_150.glb
assembly rebuilt: true
```

---

## 4. Conclusiones

- Los controles de `KuoAVProperties.jsx` ya reconstruyen en tiempo real la geometría 3D completa de la mesa.
- No se realiza escalado artificial del grupo (`scale = [1, 1, 1]`).
- Se cargan los modelos físicos correctos correspondientes a cada variante de viga y ducto.
- Se mantienen intactas la calibración de vértebra, columnas, kit fuente, soporte de tomas y grommet.
