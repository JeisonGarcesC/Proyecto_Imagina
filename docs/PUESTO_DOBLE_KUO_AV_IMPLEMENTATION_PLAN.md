# PLAN DE IMPLEMENTACIÓN EN PRODUCCIÓN: PUESTO DOBLE KUO AV
**Integración Determinista en Proyecto_Imagina sin Regresiones**

---

## 1. Objetivos de Implementación

1. Incorporar el producto **PUESTO DOBLE KUO AV** como ensamble nativo en el configurador.
2. Utilizar los **14 archivos GLB físicos reales** validados en la auditoría sin duplicar geometrías ni aplicar escalas espurias.
3. Garantizar el ciclo de vida completo: inserción, selección aislada, arrastre 3D libre sobre el piso ($Y=0$), sincronización bidireccional con Planta 2D, snap lateral Bench y gestión de attachments.
4. Preservar la compatibilidad total con los productos existentes (**KUO AV Simple** y **Koncisa Plus**).

---

## 2. Estructura de Archivos a Crear y Modificar

```
src/
├── mepal/
│   └── kuoAVDoble/
│       ├── config/
│       │   └── kuoAVDobleTunables.js          # [NUEVO] Calibración canónica, offsets y variantes
│       ├── builder/
│       │   └── KuoAVDobleBuilder.js          # [NUEVO] Constructor paramétrico y resolución de piezas
│       ├── factory/
│       │   └── createKuoAVDobleInstance.js   # [NUEVO] Instanciador Three.js con metadatos y BOM
│       └── parts/
│           └── kuoAVDobleParts.js            # [NUEVO] Definición de metadatos y referencias CET
├── components/
│   ├── properties/
│   │   ├── KuoAVDobleProperties.jsx          # [NUEVO] Panel lateral con las 9 opciones interactivas
│   │   └── PropertiesPopup.jsx               # [MODIFICAR] Registro de KuoAVDobleProperties
│   ├── KuoAVPanel.jsx                        # [MODIFICAR] Botón de inserción "Puesto Doble Kuo AV"
│   └── ThreeCanvas.jsx                       # [MODIFICAR] Métodos addKuoAVDoble, swapKuoAVDobleVariant y 2D
```

---

## 3. Detalle de Implementación por Módulo

### A. `src/mepal/kuoAVDoble/config/kuoAVDobleTunables.js`
- Coordenadas canónicas en milímetros para:
  - Superficies frontal y posterior ($Z = \pm(D_{\text{nominal}}/2 + 13\text{ mm})$).
  - Vigas frontales y posteriores `KUSO420000_120/150/165`.
  - Ducto central doble `KUSO830000_120/150/165` centrado en $Z = 0$.
  - Costado intermedio `KUSO820000_120/150` en $X = 0$.
  - Grommet doble `LKAC250000_DOBLE` centrado en $Z = 0$ con penetración $32\text{ mm}$.
  - Kit fuente doble `KUAC1040000_74Doble` y vértebra lateral `KUAC650000`.
- Mapeo de variantes de ancho ($1200 \to \_120$, $1500 \to \_150$, $1650 \to \_165$).

### B. `src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js`
- Genera la lista completa de partes físicas requeridas a partir de `config`.
- Modela proceduralmente las dos superficies de trabajo `LKSU010010` respetando espesor y acabado.
- Resuelve la activación/desactivación del costado intermedio `KUSO820000`, la vértebra `KUAC650000`, el kit fuente y la baldosa divisoria.

### C. `src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js`
- Construye el `THREE.Group` raíz:
  - `kind: 'KUO_AV_DOBLE_ASSEMBLY'`
  - `isPartRoot: true`
  - `instanceId: 'KUOAVD_' + timestamp + '_' + randomId`
  - `groupId = instanceId` (Aislamiento total de selección)
- Carga las submallas GLB asíncronamente y les asigna `parentAssemblyId = instanceId`.
- Emite el registro BOM para costeo.

### D. `src/components/properties/KuoAVDobleProperties.jsx`
- Interfaz reactiva con las 9 opciones:
  1. Espesor superficie (`Formica 30` / `Melamina 30`)
  2. Kit Fuente (`Blanco` / `Negro` / `Gris`)
  3. Acabado Grommet (`Anodizado` / `Pintura`)
  4. Especial / Rematable (Checkbox)
  5. Baldosa Formica (Checkbox)
  6. Costado Intermedio KUSO820000 (Checkbox)
  7. Aumentar Altura (Checkbox / Input)
  8. Elevar Kit F Izquierdo (Checkbox)
  9. Colocar Vértebra Lateral (Checkbox)
- Invoca `swapKuoAVDobleVariant` en tiempo real sin recargas de página.

### E. `src/components/ThreeCanvas.jsx`
- Exposición de `addKuoAVDoble(config)` y `swapKuoAVDobleVariant(instanceId, config)`.
- Integración en `getPartsSnapshot2D` proyectando el rectángulo total ($W \times D_{\text{total}}$) vinculado por `instanceId`.
- Soporte en `snapActivePart` para adosamiento Bench lateral cara a cara.

---

## 4. Fases de Ejecución

1. **Fase 1**: Creación del paquete `kuoAVDoble` (`Tunables`, `Parts`, `Builder`, `Factory`).
2. **Fase 2**: Integración en `ThreeCanvas.jsx` (`addKuoAVDoble`, `swapKuoAVDobleVariant`, proyección 2D).
3. **Fase 3**: Creación del panel de propiedades `KuoAVDobleProperties.jsx` e inserción en `KuoAVPanel.jsx`.
4. **Fase 4**: Validación automatizada en `scratch/` (instancias aisladas, BBoxes, snap, attachments, drag 3D/2D).
5. **Fase 5**: Validación visual en interfaz y verificación de no regresión en KUO AV Simple y Koncisa Plus.

---

## 5. Criterios de Aceptación
- Compilación limpia con `git diff --check` y `npx vite build --emptyOutDir false`.
- Pruebas automatizadas de aislamiento multi-instancia y snap superadas.
- Todas las opciones de la interfaz reflejadas visualmente en el canvas 3D y 2D.
