# Auditoría de Modelos 3D y Assets: KUO AV - Superficie Perimetral

---

## 1. Diagnóstico General de Assets

Al inspeccionar el directorio de modelos (`public/assets/models/`), se identificó lo siguiente:

1. **Directorio `public/assets/models/Kuo AV/`:**
   - La carpeta existe en el sistema de archivos pero está **completamente vacía** ($0$ archivos).
2. **Directorio `public/assets/models/Kuo GO/`:**
   - Contiene 4 archivos monolíticos: `formica18.glb`, `formica25.glb`, `formica30.glb`, `melamina25.glb`.
   - **Diagnóstico:** Son modelos completos y rígidos de Kuo Go (tapa fija + patas fijas pegadas en una sola malla). No son modulares ni separables para la altura variable de Kuo AV.
3. **Mecanismo de Resiliencia en Ejecución:**
   - Como los archivos de `Kuo AV/` no existen físicamente en disco, `createKuoAVInstance.js` activa de forma segura la función `createPartProxyMesh(part)`. Esto permite que la mesa se instancie y funcione sin errores de JavaScript, visualizando proxies geométricos oscuros en el lugar de las patas y accesorios mientras la superficie procedural se renderiza de forma limpia y exacta.

---

## 2. Matriz de Inventario y Comparativa de Assets

| Componente | Archivo esperado en `kuoAVParts.js` | ¿Existe? | Ruta encontrada | ¿Reutilizable? | Acción requerida |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **Superficie Perimetral** | *Ninguno (Procedural)* | **SÍ** | `src/factories/surfaceFactory.js` | **SÍ (100%)** | **Mantener paramétrica.** Se genera con `createSurfaceMesh()` + cantos PVC. No requiere GLB. |
| **Travesaño Central** | *Ninguno (Procedural)* | **SÍ** | `createPartProxyMesh` / Procedural | **SÍ** | **Mantener paramétrico.** Se calcula como BoxGeometry con ancho variable $X = \text{anchoReal} - 120\text{ mm}$. |
| **Columna Telescópica Izquierda** | `/assets/models/Kuo AV/COLUMNA_MOTORIZADA.glb` | **NO** | Ninguna en `Kuo AV/` | **NO** | **Exportar desde CET:** Columna motorizada individual orientada en origen $(0,0,0)$. |
| **Columna Telescópica Derecha** | `/assets/models/Kuo AV/COLUMNA_MOTORIZADA.glb` | **NO** | Ninguna en `Kuo AV/` | **NO** | Reutiliza la misma malla GLB de la columna izquierda con rotación $Y = 180^\circ$ ($\pi$). |
| **Kit Fuente (Bajo Tapa / Elevado)** | `/assets/models/Kuo AV/KIT_FUENTE.glb` | **NO** | Ninguna en `Kuo AV/` | **NO** | **Exportar desde CET:** Bloque de tomas/electrificación estándar. |
| **Vértebra Lateral Pasacables** | `/assets/models/Kuo AV/VERTEBRA_LATERAL.glb` | **NO** | Ninguna en `Kuo AV/` | **NO** | **Exportar desde CET:** Vértebra pasacables vertical. |
| **Grommet Pasacables Circular** | `/assets/models/Kuo AV/GROMMET.glb` | **NO** | `public/assets/models/koncisaPlus/LKAC250000.glb` | **PARCIAL** | Usar temporalmente `LKAC250000.glb` o exportar el grommet oficial circular de CET. |

---

## 3. Paramétrico vs Modelos GLB: Reglas Arquitectónicas

### Piezas que DEBEN permanecer Paramétricas (Procedurales Three.js):
1. **Superficie Perimetral:**
   - Cambia continuamente de ancho ($1000$ a $1800\text{ mm}$), fondo ($600$ a $800\text{ mm}$) y espesor ($18$, $25$, $30\text{ mm}$).
   - No debe exportarse como GLB estático porque requeriría cientos de archivos rígidos.
2. **Travesaño Estructural Telescópico:**
   - Debe expandirse o contraerse en $X$ según el ancho seleccionado de la mesa sin distorsionar los cabezales.

### Piezas que DEBEN ser GLB:
1. **Columna Motorizada (Pata con motor y base de piso):**
   - Geometría mecánica detallada (perfil telescópico, pie de apoyo y platina superior de ensamble).
2. **Kit Fuente:**
   - Caja de tomas eléctricas con conectores.
3. **Vértebra Pasacables:**
   - Cadena articulada para conducción de cables desde el piso a la bandeja.
4. **Grommet:**
   - Tapa pasacables inyectada o metálica con acabado superficial.

---

## 4. Análisis de Columnas y Rango de Alturas en CET

1. **¿Se necesita un GLB por cada altura?**
   - **No.** Las columnas motorizadas en la realidad y en CET son ensambles telescópicos de 2 o 3 etapas.
   - Para IMAGINA se debe exportar **un único GLB de la columna motorizada base** (en su cota mínima de $730\text{ mm}$).
   - La elevación de la mesa ($730 \to 1200\text{ mm}$) posiciona la superficie en $Y = \text{alturaMm} / 1000$ y la columna escala o se despliega verticalmente en su nodo superior.

---

## 5. Qué debemos exportar desde CET para obtener la representación idéntica

Para que la mesa KUO AV se visualice completa y fotorrealista (reemplazando los proxies negros):

1. **`COLUMNA_MOTORIZADA.glb`**
   - Origen $(0,0,0)$ en el centro de apoyo del pie en el piso ($Y=0$).
   - Altura base: $730\text{ mm}$ (desde el piso hasta la cara de apoyo bajo la superficie).
   - Fondo del pie: $600\text{ mm}$ a $700\text{ mm}$.
   - Guardar en: `public/assets/models/Kuo AV/COLUMNA_MOTORIZADA.glb`.

2. **`KIT_FUENTE.glb`**
   - Modelo de la caja de tomas con platina de anclaje.
   - Guardar en: `public/assets/models/Kuo AV/KIT_FUENTE.glb`.

3. **`VERTEBRA_LATERAL.glb`**
   - Modelo del ducto flexible vertical de piso a superficie.
   - Guardar en: `public/assets/models/Kuo AV/VERTEBRA_LATERAL.glb`.

4. **`GROMMET.glb`**
   - Modelo de la tapa pasatapas circular ($80\text{ mm}$ de diámetro).
   - Guardar en: `public/assets/models/Kuo AV/GROMMET.glb`.
