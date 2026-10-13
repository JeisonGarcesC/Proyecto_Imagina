# CRITERIUM — Fase 8.4: panel de composición

## Alcance

El bloque **COMPOSICIÓN** del LeftPanel muestra el sistema, sus secuencias en el orden guardado, los módulos físicos de cada secuencia y las conexiones existentes. Lee `getCritteriumStructure()` y la selección compartida; no persiste una segunda jerarquía ni crea productos comerciales. Las tarjetas de secuencia y la lista de conexiones son plegables.

Seleccionar un sistema, una secuencia o un módulo usa las API de selección 3D existentes. La selección física de un frame actualiza el resaltado del módulo en el panel. Seleccionar una conexión muestra su marcador espacial en azul usando el helper de snap existente. Las acciones de agregar, duplicar o eliminar módulos, agregar secuencias y desconectar reutilizan las operaciones existentes de CRITERIUM y su historial.

## Corrección encontrada durante la validación

Tras editar un módulo, `replaceCritterium8Sequence` agregaba la secuencia reconstruida al final de `system.children`, aunque `sequenceIds` conservaba el orden anterior. Una operación posterior de conexión fallaba con `CRITERIUM_SYSTEM_SEQUENCE_MISMATCH`. La sustitución ahora conserva el índice del hijo anterior.

## Validación automatizada

- `test/critteriumCompositionPanel.test.js`: composición vacía, contadores, orden, selección y actualización desde snapshots.
- `test/critteriumModuleSlots.test.js`: sustitución física y orden de los hijos del sistema.

## Validación interactiva en Electron

El guion `electron/phase84-composition.cjs`, ejecutado mediante `electron/phase84-composition.cmd`, crea una oficina con tres secuencias y comprueba la selección panel→3D y 3D→panel, así como agregar, duplicar y eliminar módulos y conectar secuencias. Los registros quedan en `electron/phase84-composition.log`. Las capturas `electron/phase84-composition*.png` son artefactos locales de la ejecución.

Resultado ejecutado: la composición mostró 3 secuencias y 6 módulos al inicio; agregar, duplicar y eliminar cambió el contador a 7, 8 y 7. Alinear y conectar terminó con una conexión visible en el panel. Al seleccionarla, la API 3D informó el mismo `connectionId` que la entidad del sistema. La captura editada muestra la tarjeta y el modelo en Electron.

## Límites

El panel refleja diagnósticos y datos ya presentes en CRITERIUM. No modifica catálogo, BOM, cotización, geometría comercial ni las líneas MULTIPLE, LINK, KONCISA, VETRO o LOCKERS. La captura visual requirió mostrar temporalmente la ventana Electron para que el compositor actualizara el desplazamiento del LeftPanel.

La batería completa `npm test` terminó con 346/375 pruebas pasadas y 29 fallos preexistentes de otras áreas. `npm run lint` informó 127 problemas existentes en el repositorio; el lint dirigido de los módulos nuevos y modificados de esta fase pasó.
