# KUO AV Final Visibility & Calibration Diagnostic

---

## 1. Tabla de Visibilidad y Estado de Componentes

| Componente | Código CET | Archivo GLB | Builder | Loader | Assembly | Visible | Posición Final (mm) | Problema / Diagnóstico |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Superficie** | `LKSU010010` | *Procedural* | SÍ | SÍ | SÍ | SÍ | $[0.0, 715.0, 0.0]$ | Ninguno. Procedural centrada $1200\times 600\times 30\text{ mm}$. |
| **Costado Izquierdo** | `KUSO800000` | `KUSO800000_IZQ.glb` | SÍ | SÍ | SÍ | SÍ | $[-600.0, 0.0, 300.0]$ | Ninguno. Pata izquierda toca piso $Y=0$ y se alinea con lateral. |
| **Costado Derecho** | `KUSO800000` | `KUSO800000_DER.glb` | SÍ | SÍ | SÍ | SÍ | $[+524.0, 0.0, 300.0]$ | Ninguno. Pata derecha toca piso $Y=0$ y se alinea con lateral. |
| **Viga Soporte** | `KUSO420000` | `KUSO420000_150.glb` | SÍ | SÍ | SÍ | SÍ | $[-748.0, 660.0, 250.0]$ | Variante física de $1496\text{ mm}$ (nominal 150). Centrada a $1,1,1$ sin escalar. |
| **Ducto Cableado** | `KUSO860000` | `KUSO860000_165.glb` | SÍ | SÍ | SÍ | SÍ | $[-779.5, 303.0, -149.0]$ | Variante física de $1559\text{ mm}$ (nominal 165). Centrado a $1,1,1$ sin escalar. |
| **Vértebra Metálica** | `KUAC650000` | `KUAC650000.glb` | Condicional | SÍ | SÍ | SÍ | $[-35.0, 25.0, -88.7]$ | Aparece únicamente cuando `vertebraLateral === true`. |
| **Kit Fuente** | `KUAC1040000` | `KUAC1040000_74.glb` | Condicional | SÍ | SÍ | SÍ | $[-595.6, 15.0, 41.0]$ | Aparece únicamente cuando `kitFuente === true`. |
| **Soporte Tomas** | `KUAC680000` | `KUAC680000.glb` | Condicional | SÍ | SÍ | SÍ | $[-303.5, 572.0, -70.0]$ | Aparece únicamente cuando `kitFuente === true`. |
| **Grommet 4 Tomas** | `LKAC250000` | `LKAC250000.glb` | SÍ | SÍ | SÍ | SÍ | $[0.0, 744.0, -229.0]$ | Empotrado sobre superficie posterior $Z = -229\text{ mm}$. |
| **Botonera LINAK** | `DPBK06` | *Sin GLB (BOM)* | SÍ | N/A | N/A | N/A | $[+510.0, 706.6, 274.0]$ | Componente lógico registrado en BOM. |

---

## 2. Diagnóstico Técnico Específico de la Vértebra (`KUAC650000.glb`)

- **¿Fue generada por el Builder?:** **SÍ**, cuando `config.vertebraLateral === true`.
- **¿Fue cargada por el Loader?:** **SÍ**, `GLTFLoader` parsea `KUAC650000.glb` ($939,780\text{ bytes}$, $23,437$ vértices).
- **¿Fue agregada al `assemblyGroup`?:** **SÍ**, como nodo hijo directo con `userData.codigoCET = 'KUAC650000'` y `userData.isSubPart = true`.
- **Posición Local en Three.js:** $X = -35.0\text{ mm}$, $Y = 25.0\text{ mm}$, $Z = -88.7\text{ mm}$ (equivalente a $[-0.035, 0.025, -0.0887]\text{ m}$).
- **Rotación:** $[0^\circ, 0^\circ, 0^\circ]$.
- **Escala:** $[1, 1, 1]$ (estricto, sin deformación).
- **Bounding Box Mundial Resultante:**
  - $\text{Min}: X = -35.0\text{ mm}, Y = 25.2\text{ mm}, Z = -250.0\text{ mm}$
  - $\text{Max}: X = +35.0\text{ mm}, Y = 651.7\text{ mm}, Z = -88.7\text{ mm}$
  - $\text{Centro}: X = 0.0\text{ mm}, Y = 338.4\text{ mm}, Z = -169.4\text{ mm}$
- **¿Por qué no aparecía visualmente?:**
  1. En la configuración base de inserción `baseConfig`, `vertebraLateral` estaba en `false` por defecto (por lo que el builder no la creaba a menos que el usuario activara el toggle).
  2. El material del GLB `transparencyGM` tiene `alphaMode: "BLEND"`; se añadió la instrucción `depthWrite = true` y `side = THREE.DoubleSide` en el recorrido de mallas de `createKuoAVInstance` para garantizar que la malla nunca se descarte en el buffer de profundidad.
  3. El `instanceId: undefined` en `swapKuoAVVariant` impedía la reconstrucción reactiva cuando se modificaban propiedades tras hacer clic en una submalla.

---

## 3. Pruebas de Validación de Estado

### Prueba 1: Configuración Canónica Completa (`vertebraLateral: true`, `kitFuente: true`)
- Total de partes: **$10$ partes** ($9$ mallas 3D + $1$ lógica en BOM).
- Componentes visibles en escena:
  - ✓ Superficie perimetral
  - ✓ Costado izquierdo
  - ✓ Costado derecho
  - ✓ Viga soporte
  - ✓ Ducto de cableado
  - ✓ **Vértebra pasacables**
  - ✓ **Kit fuente de alimentación**
  - ✓ **Soporte de tomas**
  - ✓ Grommet de 4 tomas

### Prueba 2: Configuración Estándar (`vertebraLateral: false`, `kitFuente: false`)
- Total de partes: **$7$ partes** ($6$ mallas 3D + $1$ lógica en BOM).
- Componentes visibles en escena:
  - ✓ Superficie perimetral
  - ✓ Costado izquierdo
  - ✓ Costado derecho
  - ✓ Viga soporte
  - ✓ Ducto de cableado
  - ✓ Grommet de 4 tomas
  - ✗ Vértebra (Ausente correctamente)
  - ✗ Kit fuente (Ausente correctamente)
  - ✗ Soporte de tomas (Ausente correctamente)
