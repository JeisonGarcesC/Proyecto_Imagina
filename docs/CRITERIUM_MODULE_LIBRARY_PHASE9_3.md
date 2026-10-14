# Fase 9.3 — Cierre de validación CRITERIUM

## 1. Estado inicial — PASS

Se revisó `git status` y `git diff` antes de editar. Permanecían los cambios de Fase 9.2 en `CriteriumPanel.jsx` y su documentación, junto a cambios simultáneos de KONCISA y XML que no se tocaron. Se revisaron panel, API 3D, biblioteca, Snap Engine, persistencia, BOM y cotización.

## 2. Smart Snap — PASS parcial

`electron/phase93-validation.cjs` obtiene la escena desde el ref React existente, captura la cámara durante el render de meshes, proyecta el mesh de agarre y los terminales físicos, y envía `mouseDown`/`mouseMove`/`mouseUp` reales en Electron. Registra origen, destino, bounds, coordenadas de pantalla, desplazamiento mundo, candidato, marcador y resultado. A zoom medio se obtuvo candidato `LINEAR` verde, puntos y línea visibles en el estado Three.js, posición final `[1.8, 0, -2]` y una conexión con IDs de terminales correctos. Se verificó Undo después de cada gesto. La inspección humana del marcador sigue **PENDING**.

## 3. Distancias — PASS parcial

La tolerancia real del motor es 0,300 m y la de preview 0,450 m. Los arrastres solicitados de 50, 100, 200 y 250 mm dieron distancias reales aproximadas de 36,1, 88,6, 196,9 y 250,9 mm tras redondear a píxeles; todos mostraron candidato verde y produjeron una conexión. Los objetivos de 299, 300 y 301 mm proyectaron el mismo píxel y acabaron cerca de 304,5 mm: candidato amarillo, sin conexión. Por ello la discriminación exacta de 299/300/301 mm mediante mouse queda **PENDING**. No se cambió la tolerancia.

## 4. Zoom — PENDING

Se intentó repetir el arrastre tras cambiar el zoom con eventos de rueda y recalcular la proyección. La cámara cambió de posición, pero el gesto no inició el arrastre de la secuencia en ese encuadre. El harness lo detecta y falla explícitamente; no se infiere independencia de zoom a partir del cálculo del motor.

## 5. Rotación — PENDING

Los gestos 3D a 90° y orientaciones incompatibles no se ejecutaron en Electron en esta fase. La prueba dirigida existente cubre reglas y rotación de forma instrumental.

## 6. Selección 3D → panel — PENDING

La Fase 9.2 verificó selección física de frames, piezas y junctions. Falta repetir y comprobar la fila activa exacta del sistema, secuencia, módulo y slot, además de Properties, en esta fase.

## 7. Movimiento de frame — PENDING

No se hizo un arrastre físico aislado de frame en Electron durante Fase 9.3.

## 8. Movimiento de secuencia — PASS parcial

El arrastre real de la secuencia de tres frames conservó `systemId` y `sequenceId`, dejó inmóvil la otra secuencia y creó la conexión prevista. Falta moverla nuevamente una vez conectada.

## 9. Movimiento de sistema — PENDING

No se ejecutó un arrastre físico del sistema completo en Electron durante Fase 9.3. La prueba dirigida comprueba operaciones espaciales del modelo, sin sustituir el gesto.

## 10. Conexiones — PASS parcial

Se crearon conexiones LINEAR con `connectionId`, secuencias y terminales esperados. Undo eliminó cada conexión y restauró el transform inicial. La prueba dirigida existente verificó duplicado inverso y desconexión conservando IDs y BOM. Queda **PENDING** repetir duplicado inverso, desconexión y Ctrl+Y mediante controles de Electron.

## 11. Organización — PENDING

No se pulsó «Organizar oficina» en esta fase.

## 12. Colisiones — PENDING

No se ejecutó diagnóstico visual de `NEAR_COLLISION` o `COLLISION_REAL` tras organizar.

## 13. Historial — PASS parcial

Ctrl+Z después de cada arrastre restauró transform y eliminó la conexión en una acción observada. Quedan **PENDING** Ctrl+Y y las operaciones de crear, agregar, eliminar, duplicar y desconectar por la UI de esta fase. Las pruebas unitarias existentes cubren varios de esos contratos.

## 14. Persistencia — PENDING

La prueba dirigida cubrió serialización y restauración de conexiones, transformaciones, frames y BOM. No se guardó ni reabrió en una ventana Electron nueva la escena creada con el nuevo gesto.

## 15. BOM — PENDING

La prueba dirigida cubrió invariancia comercial de operaciones espaciales. No se comparó aquí el BOM de la escena Electron antes/después de mover, conectar, organizar y reabrir, ni el ciclo agregar/Undo/Redo.

## 16. Cotización — PENDING

Se leyó el código actual de cotización. No se comparó el JSON exportado tras operaciones espaciales y reapertura en esta fase.

## 17. Biblioteca — PASS parcial

Se creó de nuevo `OFFICE_2_3` desde la biblioteca y se comprobaron dos secuencias con dos y tres slots. La Fase 9.1 ya probó los otros presets en Electron y la prueba dirigida de biblioteca pasó. No se repitieron todos los presets por UI en Fase 9.3.

## 18. UX — PENDING

Las capturas `electron/phase93-*.png` muestran el escenario 3D. El panel de Fase 9.2 mantiene la corrección de ancho. Falta inspección visual humana completa de biblioteca, composición, scroll, mensajes y marcador.

## 19. Bugs encontrados — PASS

El fallo conocido del harness de Fase 9.2 eran coordenadas fijas. Se confirmó además que el redondeo de eventos de mouse impide distinguir 299, 300 y 301 mm en el encuadre medio. El intento de zoom revela que el criterio de raycast del harness aún no reproduce de forma estable el inicio del arrastre tras cambiar la cámara. No hay evidencia suficiente para clasificar esto como bug de Smart Snap.

## 20. Bugs corregidos — PASS parcial

El harness ya calcula dinámicamente terminales, bounding box, cámara, raycast y proyección. La ruta de zoom del harness sigue pendiente. No se cambió código de producto en Fase 9.3.

## 21. Pruebas — PASS parcial

Las pruebas dirigidas `critteriumModuleLibrary`, `critteriumSmartLayout`, `critteriumOfficePhase8`, `critterium8SequencePersistence` y `critteriumQuotationPhase7` pasaron **26/26**. `npm test`: **344/375**, con 31 fallos, el mismo conteo de Fase 9.2. Los fallos incluyen resolución de un import de KONCISA, pruebas de KONCISA, LINK y LOCKERS; no apareció un fallo de CRITERIUM. `npm run build`: código **0**; Vite advirtió que Node 20.17.0 está por debajo de su versión requerida. `npm run lint`: código **1**, con **117 errores y 8 advertencias** repartidos en otras líneas y archivos comunes; el log no mostró rutas de `critterium8` ni `CriteriumPanel.jsx`. `git diff --check`: código **0**, con advertencias de conversión LF/CRLF.

## 22. Regresiones — PENDING

No se modificaron reglas ni producto CRITERIUM en Fase 9.3. La suite conserva el conteo 344/375 y las pruebas dirigidas pasaron; los escenarios interactivos pendientes impiden concluir ausencia total de regresiones. El lint completo falla fuera de CRITERIUM y no se corrigió por estar fuera del alcance.

## 23. Limitaciones — PENDING

El harness lee refs React y callbacks de render en modo desarrollo; es una técnica de prueba, no contrato público. La precisión del mouse queda limitada por píxeles y el encuadre. La prueba visual humana y varios flujos Electron aún no están ejecutados. La documentación no convierte pruebas unitarias o evidencia de Fase 9.1 en pruebas interactivas de Fase 9.3.

## 24. Resultado final — PENDING

**FASE 9.3 PENDING.** Faltan, como mínimo, zoom con arrastre reproducible, discriminación de 299/300/301 mm por mouse, rotación 90°, movimiento físico de frame y sistema, selección 3D→panel completa, organización, persistencia Electron después del gesto, comparación de BOM y cotización tras ese ciclo, y revisión UX humana. No se declara lista para la siguiente etapa.
