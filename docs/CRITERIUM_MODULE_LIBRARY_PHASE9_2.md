# Fase 9.2 — validación 3D de la biblioteca CRITERIUM

## Alcance y método

Se abrió la aplicación real en Electron (1600 × 1000), se creó desde la biblioteca la oficina `OFFICE_2_3` y se interactuó con la escena mediante eventos de mouse de Electron. El harness reproducible está en `electron/phase92-3d-validation.cjs`. Sus capturas `electron/phase92-*.png` son evidencia instrumental; no sustituyen la inspección visual humana.

## Resultados comprobados

| Caso | Estado | Evidencia |
| --- | --- | --- |
| Oficina de biblioteca en 3D | PASS instrumental | Se crearon un sistema, dos secuencias y cinco frames; la captura `phase92-base.png` muestra ambas secuencias completas. |
| Selección panel → 3D | PASS instrumental | Los controles de sistema, secuencia y frame cambiaron `selectedPart` al objeto correspondiente. |
| Selección 3D → panel | PASS parcial | El clic físico en un frame cambió `selectedPart` a su assembly; los clics en barras eligieron partes físicas y junctions. Falta una comprobación automatizada del resaltado exacto del módulo en el panel. |
| Movimiento 3D y Smart Snap | PASS en una ejecución | Un arrastre real trasladó la segunda secuencia a `[1.8, 0, -2]`, conservó `systemId` y ambos `sequenceId`, y produjo una conexión `LINEAR` con ID y puntos de origen/destino. |
| Repetibilidad del gesto automatizado | FALLÓ | La repetición usó coordenadas de pantalla fijas; el encuadre cambió, el primer arrastre acabó en `[2.2494, 0, -1.4524]` y el segundo no produjo conexión. El harness detuvo la ejecución al detectar el fallo. Esto no demuestra un fallo del motor de snap; sí impide declarar estable esta automatización. |
| Controles de composición | PASS instrumental tras corrección | El contenedor se ajustó al ancho disponible. Antes su contenido medía aproximadamente 470 px dentro de 208 px y ocultaba controles. |

El marcador de snap se construye en `ThreeCanvas.jsx` con punto origen, punto destino, punto final y línea de color según `GREEN`, `YELLOW` o `RED`. La captura de arrastre no permite distinguirlos con certeza a esta escala, de modo que su calidad visual queda **PENDING**.

## Pendiente en la interfaz

Quedan **PENDING**: inspección humana de jerarquía visual y legibilidad; distancias reales de 50/100/200/250/299/300/301 mm; comparación de zoom cercano y lejano; giro a 90°; conexión inversa duplicada mediante mouse; mover una secuencia ya conectada; organizar desde el panel; Undo/Redo del gesto; guardar, cerrar y reabrir tras ese gesto; comparar BOM y cotización antes y después. El harness llegó a probar la conexión real una vez, pero la repetición se detuvo antes de estas operaciones. No se atribuyen a ellas resultados de Fase 9.1.

## Cambios y límites

Se cambió únicamente el contenedor de `src/components/CriteriumPanel.jsx` para que la composición ocupe el ancho real del panel y permita ver sus controles. No se cambiaron geometría, presets, reglas espaciales ni datos comerciales. La automatización con coordenadas fijas es frágil ante cambios de cámara o contenido; para cerrar esta fase hace falta una prueba manual en Electron o un harness que calcule los puntos de arrastre proyectando el objeto 3D.

## Validaciones de código

`npm test`: 344/375, con 31 fallos externos a CRITERIUM ya presentes en la línea base de Fase 9.1. `npm run build`: terminó con código 0 (Vite advirtió que Node 20.17.0 está por debajo de la versión requerida). `npx eslint src/components/CriteriumPanel.jsx`: código 0. `git diff --check`: código 0, con avisos de conversión LF/CRLF.

## Continuación Fase 9.3

El harness posterior ya proyecta los objetos y terminales reales desde la cámara Three.js. Sus resultados, incluidos los límites del zoom y de la precisión del mouse, están en [CRITERIUM_MODULE_LIBRARY_PHASE9_3.md](CRITERIUM_MODULE_LIBRARY_PHASE9_3.md).
