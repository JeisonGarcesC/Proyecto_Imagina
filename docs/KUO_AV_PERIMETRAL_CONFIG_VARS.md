# Variables de Configuración y Dirección: KUO AV - Superficie Perimetral

## Opciones comerciales de creacion y edicion

El formulario compartido [KuoAVOptions.jsx](../src/components/KuoAVOptions.jsx)
mantiene ancho y profundidad, ademas de las opciones de la referencia original:

- Espesor Superficie: Formica 30 o Melamina 30 (30 mm).
- Kit Fuente: Blanco, Negro o Gris; no se ofrece excluirlo en la creacion.
- Acabado de Grommet (Anodizado/Pintura): sin marcar = ALUMINIUM; marcado = PAINTED.
- Especial/Rematable, Aumentar Altura, Elevar kit F izquierdo y Colocar Vertebra Lateral.
- Incluir pantalla y su material siguen disponibles.

El doble agrega Baldosa Formica y Costado Intermedio KUSO820000. Su unico control
Colocar Vertebra Lateral cambia la ubicacion de ambas vertebras (central/lateral),
sin eliminarlas ni cambiar su cantidad en el BOM;
las configuraciones antiguas con controles independientes siguen siendo compatibles.
La interfaz ofrece estados nominales 730/1200 mm en perimetral y doble.
En el perimetral esos valores son estados nominales del configurador, no planos
de contacto del modelo. La calibracion medida en los GLB de CET sitúa la cara
inferior de la tapa a 714 mm (normal) y 1200 mm (elevado); con espesor de 30 mm
los planos superiores son 744/1230 mm. `physicalHeightMm` conserva esa medida
sin cambiar `alturaMm` ni las referencias comerciales.
La caja KUAC680000, el grommet y la botonera suben 486 mm; los brazos y su
viga KUSO420000 suben 491 mm. Los costados con base y el ducto inferior
KUSO860000 permanecen fijos. Las columnas elevadas reutilizan el asset nativo
KUAC1040000_120 disponible en Puesto Doble, verificado contra las columnas
del export perimetral CET; no se escala verticalmente la columna completa.
La vertebra central elevada usa KUAC650000_ALT y la lateral elevada usa
KUAC650000_ALT_LAT 1, conservando una sola partida KUAC650000 en el BOM.
Los dos estados de altura no activan automaticamente la casilla lateral.
La pantalla del doble queda centrada de forma fija para todos sus materiales;
el editor no muestra controles de ubicacion ni un selector separado de acabado
de pantalla.
Las alturas intermedias de configuraciones antiguas trasladan solamente el
segmento superior del modelo 74; la interfaz sigue ofreciendo los dos estados.
Las pantallas integradas y las anexadas mediante la API existente siguen el
plano fisico de la tapa durante reconstruccion, movimiento y cambio de altura.
La botonera DPBK06 y la vertebra central alta se extrajeron del GLB elevado
proporcionado por el usuario. La extraccion reproducible esta en
[extractKuoAVHeightAssets.mjs](../scripts/extractKuoAVHeightAssets.mjs); verifica
las firmas de los componentes antes de copiar geometria y mantiene escala 1:1.
Los exports adicionales "solo con elevar kit izquierdo" y "perimetral con
aumentar altura y elevar kit acivado" confirman que `elevarKitFIzquierdo` no
cambia la geometria en los dos estados perimetrales 1200x600 comprobados:
las 46 mallas mantienen geometria y transformaciones locales identicas a
sus respectivos estados sin esa casilla, descontando la ubicacion global.
Se conserva la opcion serializable y el metadato izquierdo sin inventar un
desplazamiento, cambiar el BOM ni activar altura o vertebra automaticamente.
Esto no demuestra el comportamiento de otras familias o combinaciones.
En el doble, los tres exports CET suministrados confirman una separacion central
de 26 mm, tapa inferior a 714/1201 mm y tapa superior a 744/1231 mm.
Al elevar, vigas y brazos suben 491 mm, soportes de tomas 485 mm y grommet
489 mm; bases y ducto inferior KUSO830000 siguen fijos. Las cuatro columnas
conservan base a 15 mm y usan el modelo nativo 120 sin deformacion vertical.
Se retiran los canales superiores duplicados KUSO860000 y el kit central
visual adicional, ausentes en estos exports, conservando las dos partidas
comerciales del kit fuente. Las botoneras reales siguen cada superficie.
El export elevado contiene una botonera erroneamente situada unos 69 m bajo
el suelo: ese artefacto de exportacion no se replica.
Los dos exports elevados (incluido el nombrado anodizado) tienen geometria
identica, con diferencias de materiales. Se mantiene la seleccion explicita
de acabado y no se invierte el significado del checkbox por el nombre del archivo.
Como altura, kit izquierdo y lateral fueron exportados conjuntamente en el
doble, no se atribuye un movimiento independiente al kit izquierdo sin evidencia.
Una altura explicita en el doble prevalece sobre un flag `aumentarAltura`
guardado anteriormente; el builder sincroniza ese flag con la altura resuelta.
La pantalla frontal perimetral anexada usa el mismo montaje fisico al acoplar,
mover o reconstruir el doble, incluso al recuperar configuraciones antiguas
sin `physicalHeightMm`.
No se han agregado precios ni referencias comerciales no confirmadas para Melamina.
El BOM doble reutiliza el catalogo confirmado del perimetral para los mismos kits
fuente blanco, negro y gris, manteniendo dos unidades y sus descripciones por color.
Las regresiones se ejecutan con `npm run test:kuo`.
La referencia perimetral 1200x600 Melamina 30, especial y grommet pintado
conserva la superficie KUO120060RECT2 a precio cero. Sus totales confirmados
son 7,396,200 COP con kit blanco/negro y 9,940,350 COP con kit gris.
En el BOM perimetral las secciones oficiales son DUCTO para la vertebra,
KIT para el soporte de tomas y SOPORTE para el kit fuente y los costados.
La pantalla frontal perimetral usa los planos de contacto del GLB KUAC710000:
la placa de montaje queda bajo la superficie (91.5 mm sobre el origen del
modelo) y la cara del vidrio toca el borde posterior (203 mm desde el origen
en Z). En el doble esa cara queda en el eje central. La altura de montaje
sigue el plano fisico y el espesor configurados; no reutiliza el pivote de las
pantallas FMT/vidrio doble. Las variantes 120/165 conservan su escala nativa;
150 adapta en X el modelo 120 disponible.
Ambas factories aplican el color seleccionado al kit/columnas y distinguen el
grommet anodizado del pintado sobre copias de los materiales GLB, sin modificar
los recursos compartidos. El editor flotante limita su altura al espacio disponible
debajo del ancla, permitiendo acceder a todas las opciones mediante scroll.

La primera insercion del doble usa el encuadre existente antes de que el registro
de piezas hijas impida reconocerlo como primer producto. No cambia la calibracion
de modelos ni la logica de camara.

Cada pulsacion de Crear inicia una configuracion independiente, separada por
0.50 m de los limites reales de los ensambles KUO AV existentes, incluidos
puestos movidos o rotados. Los puestos del mismo lote siguen unidos borde a
borde y conservan su identificador de lote para las operaciones existentes.
La separacion se calcula despues de cargar el primer ensamble, sin alterar
las posiciones de configuraciones anteriores ni posiciones explicitas.

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
