# Variables de Configuración y Dirección: KUO AV - Superficie Perimetral

---

## 1. Archivo de Configuración en Código

El archivo principal para cambiar de dirección, rotación y posición cada pieza es:

👉 **[kuoAVPerimetralTransforms.js](file:///c:/Users/fermalhe/OneDrive%20-%20Carvajal%20S.A/Documentos%202021/Escritorio/Proyecto_Imagina/src/mepal/kuoAV/config/kuoAVPerimetralTransforms.js)**

---

## 2. Estructura de Variables Disponibles

Cada componente cuenta con tres parámetros ajustables:

1. **`rotacionDeg`**: Rotación en grados sexagesimales `[x, y, z]` (Ejemplo: `y: 90` o `y: 180` para girar la dirección de la pieza).
2. **`offsetMm`**: Desplazamiento fino en milímetros `[x, y, z]` (Ejemplo: `x: 50` para mover $50\text{ mm}$ a la derecha o `z: -100` para mover hacia atrás).
3. **`escala`**: Factor de escala `[x, y, z]` (Por defecto `[1, 1, 1]`).

---

## 3. Matriz de Variables por Componente

```javascript
export const KUO_AV_PERIMETRAL_TRANSFORMS = {
  // ── 1. PATA / COSTADO IZQUIERDO (KUSO800000_IZQ) ──
  costadoIzquierdo: {
    rotacionDeg: { x: -90, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },

  // ── 2. PATA / COSTADO DERECHO (KUSO800000_DER) ──
  costadoDerecho: {
    rotacionDeg: { x: -90, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },

  // ── 3. VIGA SOPORTE SUPERFICIE (KUSO420000_150) ──
  vigaSoporte: {
    rotacionDeg: { x: -90, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },

  // ── 4. DUCTO CABLEADO (KUSO860000_165) ──
  ductoCableado: {
    rotacionDeg: { x: -90, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },

  // ── 5. VÉRTEBRA PASACABLES (KUAC650000) ──
  vertebra: {
    rotacionDeg: { x: -90, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },

  // ── 6. KIT FUENTE (KUAC1040000_74) ──
  kitFuente: {
    rotacionDeg: { x: -90, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },

  // ── 7. SOPORTE DE TOMAS (KUAC680000) ──
  soporteTomas: {
    rotacionDeg: { x: -90, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },

  // ── 8. GROMMET 4 TOMAS (LKAC250000) ──
  grommet: {
    rotacionDeg: { x: -90, y: 0, z: 0 },
    offsetMm: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
};
```

---

## 4. Guía Rápida para Modificar Direcciones:

- **Girar una Pata $180^\circ$ sobre sí misma:**
  Modifica `costadoIzquierdo.rotacionDeg.y: 180` o `costadoDerecho.rotacionDeg.y: 180`.
- **Invertir la dirección del pie de apoyo:**
  Ajusta `costadoIzquierdo.rotacionDeg.z` o `costadoIzquierdo.offsetMm.z`.
- **Girar la Vértebra pasacables:**
  Cambia `vertebra.rotacionDeg.y: 90` o `180`.
- **Centrar la Viga o el Ducto:**
  Ajusta `vigaSoporte.offsetMm.x` o `ductoCableado.offsetMm.x`.
