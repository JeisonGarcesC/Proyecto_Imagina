# Fase 9 — Biblioteca CRITERIUM

## Arquitectura y opciones

La biblioteca del LeftPanel llama a las APIs existentes `createConfiguredCritteriumSequence`, `createConfiguredCritteriumSystem` y `createCritteriumSystemFromSequenceIds`. Las configuraciones disponibles son secuencias de dos o tres frames, una oficina vacía, una oficina con una secuencia de dos frames y una oficina con dos secuencias separadas de dos y tres frames. El configurador existente valida dimensiones y genera los objetos físicos, slots e identidades. No se crean conexiones automáticas porque las filas separadas no tienen un anclaje validado entre sí.

El frame aislado y la secuencia personalizada abren los editores existentes. Un frame aislado no es una secuencia válida. La opción de operaciones abre las herramientas existentes de composición y sistema. La vista previa es HTML lógico; no introduce geometría ni datos comerciales.

## Fuentes comerciales y límites

Los presets usan `critteriumOfficeTemplates.js`, `critterium8Configurator.js` y las definiciones de frame actuales. La biblioteca no define códigos, referencias, materiales, acabados, precios ni moneda. El BOM y la cotización siguen derivándose de los objetos creados por las rutas existentes; cualquier dato parcial debe conservar el diagnóstico de la cotización. No hay plantilla de conexión automática ni topología T/cruce.

## Historial, persistencia y edición

Cada botón de creación invoca una sola API de alto nivel. La edición posterior, duplicación, conexión, organización, selección, Undo/Redo y persistencia usan las herramientas existentes de CRITERIUM. Continúa vigente el bloqueo de Fase 8.6 al editar un terminal conectado sin anclaje físico alternativo.

## Validación

`test/critteriumModuleLibrary.test.js` comprueba que los presets son borradores válidos, que la oficina de dos secuencias tiene la composición prevista y que no se introducen datos comerciales ni secuencia de un único frame. La validación instrumental de Electron de Fase 9.1 se documenta a continuación.

## Validación Fase 9.1

El harness `electron/phase91-library-validation.cjs` abre la aplicación y pulsa los cinco presets de biblioteca. La lectura instrumental del modelo confirmó: secuencia de 2 módulos/2 frames; secuencia de 3 módulos/3 frames; oficina vacía con 0 secuencias, módulos y frames; oficina de 1 secuencia; oficina de 2 secuencias con 5 módulos y 5 frames. El panel mostró los contadores inmediatamente. Los IDs de sistema, secuencia, slot, módulo y frame fueron únicos. No se generaron conexiones automáticas.

Desde la oficina creada por biblioteca se ejecutaron las APIs existentes de agregar, duplicar, eliminar y reordenar un módulo; duplicar secuencia y sistema; alinear extremos, conectar, rechazar la conexión inversa con `CRITERIUM_SYSTEM_DUPLICATE_CONNECTION`, desconectar y organizar. La conexión fue `LINEAR` entre `TERMINAL_END` y `TERMINAL_START`. El BOM permaneció igual tras alineación, conexión, desconexión y organización. Undo/Redo de creación de la oficina restauró el mismo systemId y ambas secuencias en una sola acción; Undo/Redo de agregar módulo y desconectar restauró las cantidades esperadas.

Se guardó el proyecto mediante Archivo → Guardar y se abrió en una ventana Electron nueva mediante el input de archivo instrumentado. Se compararon sistemas, secuencias, slots, transformaciones y resúmenes BOM antes y después. El panel se reconstruyó sin selección manual; al haber varias oficinas, mostró la primera guardada, que en este escenario era la vacía. La cotización de la oficina de 2 módulos mantuvo moneda COP y total 1.512.000 COP después de reabrir.

Para equivalencia, el harness creó además una oficina de 2 módulos mediante el control manual anterior y comparó las cotizaciones exportadas por la UI. Coincidieron tres líneas con códigos `22191900011`, `22191900127`, `22000014321`, cantidades, descripciones, material, acabado disponible, precios unitarios, subtotales y total. `reference` y `finishCommercial` fueron `null` en ambos flujos; el harness no inventó esos datos. La oficina editada de dos secuencias produjo cotización de 4.321.800 COP con diagnósticos informativos sobre acabado y puerta no documentada.

Clasificación: **PASS instrumental** para los escenarios anteriores. Los presets se pulsaron mediante eventos de mouse Electron. La edición, duplicación, conexión y organización se invocaron mediante la API interna real desde la ventana Electron; la elección de preset usó el evento `change` DOM del select. La comparación manual usó un clic DOM instrumentado después de que `scrollIntoView` colocara el botón detrás de la barra lateral del harness. La carga usó CDP para seleccionar el archivo. **PENDING**: inspección visual humana, selección física 3D y arrastre Smart Snap con mouse. El harness no prueba esas rutas y no se declaran PASS.

No hubo cambios de producto en Fase 9.1: únicamente se añadió el harness y esta documentación. Los fallos intermitentes de las primeras ejecuciones provinieron del selector `title` del icono CRITERIUM, de devolver un Object3D no serializable desde el harness y de un clic nativo cubierto por la barra lateral. Se corrigieron en el harness y la ejecución final terminó con `PASS INSTRUMENTAL`.

Validación final: pruebas dirigidas CRITERIUM **15/15**; `npm test` **344/375**, con los mismos 31 fallos externos de la línea base; `npm run build` exitoso; lint dirigido exitoso; `git diff --check` exitoso. La fase permanece **PENDING** para selección física 3D, gesto de Smart Snap y revisión visual humana. No se modificaron KONCISA, LINK, LOCKERS, VETRO, XML comerciales ni código de producto durante Fase 9.1.
