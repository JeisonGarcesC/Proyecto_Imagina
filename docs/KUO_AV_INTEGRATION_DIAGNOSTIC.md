# KUO AV Integration Diagnostic

---

## 1. Assets Físicos Encontrados

Auditoría física en el directorio `public/assets/models/Kuo AV/`:

| Archivo GLB | Tamaño (Bytes) | Mallas | Vértices Totales | Bounding Box Local ($X \times Y \times Z$ mm) | Materiales | Estado Físico |
| :--- | :---: | :---: | :---: | :---: | :--- | :---: |
| **`KUAC650000.glb`** | $939,780$ | $1$ | $23,437$ | $70.0 \times 161.3 \times 626.6$ | `Material 1`, `transparencyGM` | **Presente y Válido** |
| **`KUAC680000.glb`** | $284,968$ | $3$ | $6,813$ | $125.0 \times 80.0 \times 41.5$ | `transparencyGM` | **Presente y Válido** |
| **`KUAC1040000_74.glb`** | $518,808$ | $2$ | $12,348$ | $50.0 \times 80.0 \times 590.0$ | `Material 1`, `transparencyGM` | **Presente y Válido** |
| **`KUSO420000_150.glb`** | $156,092$ | $2$ | $3,710$ | $990.0 \times 20.0 \times 40.0$ | `Material 1`, `transparencyGM` | **Presente y Válido** |
| **`KUSO800000_IZQ.glb`** | $270,748$ | $4$ | $6,253$ | $85.4 \times 147.0 \times 418.3$ | `Material 1` | **Presente y Válido** |
| **`KUSO800000_DER.glb`** | $285,808$ | $4$ | $6,616$ | $85.4 \times 147.0 \times 418.3$ | `Material 1` | **Presente y Válido** |
| **`KUSO860000_165.glb`** | $372,980$ | $6$ | $8,863$ | $70.0 \times 25.0 \times 60.0$ | `Material 1`, `transparencyGM` | **Presente y Válido** |
| **`LKAC250000.glb`** | $815,552$ | $6$ | $20,162$ | $30.0 \times 115.5 \times 33.4$ | `Material 1`, `transparencyGM` | **Presente y Válido** |

---

## 2. Registro en `kuoAVTunables.js`

Todos los códigos CET y archivos GLB están centralizados y congelados en `KUO_AV_GLB_FILES`, `KUO_AV_CET_CODES` y `KUO_AV_CALIBRATION`:

- `KUO_AV_GLB_FILES.VERTEBRA = 'KUAC650000.glb'`
- `KUO_AV_GLB_FILES.SOPORTE_TOMAS = 'KUAC680000.glb'`
- `KUO_AV_GLB_FILES.KIT_FUENTE = 'KUAC1040000_74.glb'`
- `KUO_AV_GLB_FILES.VIGA_SOPORTE = 'KUSO420000_150.glb'`
- `KUO_AV_GLB_FILES.DUCTO_CABLEADO = 'KUSO860000_165.glb'`
- `KUO_AV_GLB_FILES.COSTADO_IZQ = 'KUSO800000_IZQ.glb'`
- `KUO_AV_GLB_FILES.COSTADO_DER = 'KUSO800000_DER.glb'`
- `KUO_AV_GLB_FILES.GROMMET = 'LKAC250000.glb'`

---

## 3. Registro en `kuoAVParts.js`

| Código CET | Nombre de Parte | Rol | Tipo | Modelo | Archivo GLB Asignado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`LKSU010010`** | Superficie Perimetral | `SURFACE` | `superficie` | Procedural | *N/A (BoxGeometry)* |
| **`KUSO800000`** | Costado Izquierdo con Base | `LEFT_COLUMN` | `columna` | GLB | `KUSO800000_IZQ.glb` |
| **`KUSO800000`** | Costado Derecho con Base | `RIGHT_COLUMN` | `columna` | GLB | `KUSO800000_DER.glb` |
| **`KUSO420000`** | Viga Soporte Superficie | `CROSSBAR` | `viga` | GLB | `KUSO420000_150.glb` |
| **`KUSO860000`** | Ducto Cableado | `DUCT` | `ducto` | GLB | `KUSO860000_165.glb` |
| **`KUAC650000`** | Vértebra Metálica Pasacables | `VERTEBRA` | `vertebra` | GLB | `KUAC650000.glb` |
| **`KUAC1040000`** | Kit Fuente Alimentación | `POWER_KIT` | `kit_fuente` | GLB | `KUAC1040000_74.glb` |
| **`KUAC680000`** | Kit Soporte Tomas | `SOCKET_SUPPORT` | `soporte_tomas` | GLB | `KUAC680000.glb` |
| **`LKAC250000`** | Grommet Aluminio 4 Tomas | `GROMMET` | `grommet` | GLB | `LKAC250000.glb` |
| **`DPBK06`** | Botonera LINAK | `CONTROL_PAD` | `control` | Lógico / BOM | *Sin GLB (BOM)* |

---

## 4. Resultado de `KuoAVBuilder.js`

El builder devuelve determinísticamente el array de `parts[]` consultando `KUO_AV_CALIBRATION`:

- **Configuración estándar (`1200x600x730`, `vertebraLateral: false`, `kitFuente: false`):**
  - Devuelve **$7$ piezas**:
    1. Superficie (`LKSU010010`) en $[0, 715, 0]\text{ mm}$
    2. Costado Izquierdo (`KUSO800000`) en $[-562, 355, 0]\text{ mm}$
    3. Costado Derecho (`KUSO800000`) en $[+562, 355, 0]\text{ mm}$
    4. Viga Soporte (`KUSO420000`) en $[0, 684.5, 0]\text{ mm}$
    5. Ducto Cableado (`KUSO860000`) en $[-0.5, 376, -219]\text{ mm}$
    6. Grommet (`LKAC250000`) en $[0.2, 728.8, -242.3]\text{ mm}$
    7. Botonera (`DPBK06`) en $[510, 706.6, 274]\text{ mm}$ (Lógica)
- **Configuración con Vértebra (`vertebraLateral: true`):**
  - Devuelve **$8$ piezas**, sumando la Vértebra (`KUAC650000`) en $[0, 338.4, -169.4]\text{ mm}$.
- **Configuración con Kit Fuente (`kitFuente: true`):**
  - Suma Kit Fuente (`KUAC1040000`) en $[-580, 15, 41]\text{ mm}$ y Soporte de Tomas (`KUAC680000`) en $[0, 655, -186.2]\text{ mm}$.

---

## 5. Resultado del GLTFLoader

Todas las llamadas a `loadGlb(part.model.src)` cargan correctamente los buffers binarios desde `public/assets/models/Kuo AV/`:
- Los $8$ archivos GLB se parsean sin errores de sintaxis, descriptores de acceso ni texturas faltantes.
- En ThreeCanvas, la función `loadExistingGlb` verifica `res.ok`, confirma que el `Content-Type` no sea HTML y parsea con `GLTFLoader.parse(arrayBuffer)`.

---

## 6. Resultado de `createKuoAVInstance.js`

Tabla de trazabilidad integral:

| Código | Archivo GLB | Existe | Registrado | Builder | Loader | Assembly | Visible | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`LKSU010010`** | *N/A (Procedural)* | SÍ | SÍ | SÍ | SÍ (Procedural) | SÍ | SÍ | **OPERATIVO** |
| **`KUSO800000_IZQ`** | `KUSO800000_IZQ.glb` | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | **OPERATIVO** |
| **`KUSO800000_DER`** | `KUSO800000_DER.glb` | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | **OPERATIVO** |
| **`KUSO420000`** | `KUSO420000_150.glb` | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | **OPERATIVO** |
| **`KUSO860000`** | `KUSO860000_165.glb` | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | **OPERATIVO** |
| **`KUAC650000`** | `KUAC650000.glb` | SÍ | SÍ | Condicional | SÍ (Si activo) | SÍ | SÍ | **OPERATIVO** |
| **`KUAC680000`** | `KUAC680000.glb` | SÍ | SÍ | Condicional | SÍ (Si activo) | SÍ | SÍ | **OPERATIVO** |
| **`KUAC1040000`** | `KUAC1040000_74.glb` | SÍ | SÍ | Condicional | SÍ (Si activo) | SÍ | SÍ | **OPERATIVO** |
| **`LKAC250000`** | `LKAC250000.glb` | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | **OPERATIVO** |
| **`DPBK06`** | *Sin GLB (BOM)* | N/A | SÍ | SÍ | N/A (Lógico) | N/A | N/A (BOM) | **OPERATIVO** |

---

## 7. Prueba Aislada de `KUAC650000.glb`

```text
[KUO DEBUG] REQUEST KUAC650000.glb
[KUO DEBUG] PATH: c:/Users/.../public/assets/models/Kuo AV/KUAC650000.glb
[KUO DEBUG] LOAD START
[KUO DEBUG] FILE READ SUCCESS, BYTES: 939780
[KUO DEBUG] LOAD SUCCESS
[KUO DEBUG] ROOT: [ 0 ]
[KUO DEBUG] CHILDREN: [ 1 ]
[KUO DEBUG] MESH COUNT: 1
[KUO DEBUG] MATERIALS: [ 'Material 1', 'transparencyGM' ]
[KUO DEBUG] MESH [0] "unnamed": Vertices=23437
[KUO DEBUG] BOUNDING BOX: X=70.0mm, Y=161.3mm, Z=626.6mm
[KUO DEBUG] POSITION: [0, 0, 0]
[KUO DEBUG] ROTATION: Matrix in Node 0 = Rx(+90deg)
[KUO DEBUG] SCALE: [1, 1, 1]
[KUO DEBUG] ADDED TO SCENE: VALID & READY
```

---

## 8. Prueba `vertebraLateral: true / false`

- **`vertebraLateral: false`:**
  - `buildKuoAV()` genera $7$ partes.
  - La vértebra **NO** se incluye en `parts[]`.
  - El GLB `KUAC650000.glb` **NO** se solicita ni se agrega al `assemblyGroup`.
- **`vertebraLateral: true`:**
  - `buildKuoAV()` genera $8$ partes.
  - La vértebra **SÍ** se incluye en `parts[]`.
  - El GLB `KUAC650000.glb` se carga, se transforma y se añade a la escena en $[0, 338.4, -169.4]\text{ mm}$.

---

## 9. Problemas Encontrados

1. **Ausencia de `KUAC650000`, `KUAC680000` y `KUAC1040000` en los logs iniciales de ThreeCanvas:**
   - Ocurría porque en `baseConfig` (configuración por defecto al hacer clic en insertar), `kitFuente: false` y `vertebraLateral: false`. Por diseño, el builder no creaba esas piezas y por ende el loader no las solicitaba.
2. **Advertencia `[swapKuoAVVariant] No se encontró el objeto Kuo AV con instanceId: undefined`:**
   - Ocurría cuando el usuario seleccionaba una submalla individual (un mesh hijo de la pata o superficie) en lugar del `assemblyGroup` raíz. En las submallas, el ID del ensamble está almacenado en `userData.parentAssemblyId` y no en `userData.instanceId`.

---

## 10. Causa Raíz

- Los GLB existen y son 100% funcionales.
- La aparente "falta de componentes" se debía a las banderas de configuración opcionales (`kitFuente`, `vertebraLateral`).
- La advertencia de `swapKuoAVVariant` se originaba en la extracción de `instanceId` en `KuoAVProperties.jsx`.

---

## 11. Próximo Paso

Habiendo garantizado que **todos los GLB se registran, se cargan y se integran al ensamble bajo control estricto**, el siguiente paso es:
- Utilizar `kuoAVTunables.js` (`KUO_AV_CALIBRATION`) para efectuar el ajuste y calibración geométrica fina de cada componente con respecto al modelo maestro `KuoGo_prueba_01.glb`.
