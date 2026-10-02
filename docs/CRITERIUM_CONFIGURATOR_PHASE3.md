# Fase 3: configurador CRITTERIUM desde Left Panel

## Flujo y responsabilidades

LeftRail abre la sección existente `critterium8`. `CriteriumPanel` ofrece Frame, Secuencia y Sistema. El formulario de secuencia admite de dos a seis frames, ancho y altura documentados, composición modular o panel completo y orientación de 0°, 90°, 180° o 270°. La vista previa enumera frames, dimensiones y encuentros. Las opciones y errores se obtienen de reglas CRITTERIUM; el panel no calcula encuentros.

`validateCritteriumSequenceDraft` valida antes de crear. ThreeCanvas usa `createCritterium8Instance`, `registerCritterium8Instance` y la misma `createCritterium8SequenceFromFrames` del flujo antiguo. La creación de un sistema repite ese flujo para cada secuencia, luego utiliza `createCritteriumSystemFromSequences` y `registerCritteriumSystem` de Fase 2. La disposición inicial usa filas a 2 m de distancia; no hay Smart Layout ni conexiones automáticas entre secuencias.

El editor del panel lista secuencias y sistemas existentes. Permite seleccionar, agregar, retirar y duplicar secuencias del sistema. La duplicación crea IDs de instancia, frame, secuencia, partes y junctions nuevos; conserva la configuración y las posiciones relativas de los frames con desplazamiento de 2 m. Properties conserva la edición de frames y partes y el botón anterior para crear una secuencia desde frames seleccionados. Al seleccionar un sistema, Properties muestra identificador, número de secuencias y transformación.

Las entidades persistidas siguen siendo `CRITTERIUM_8`, `CRITTERIUM_8_SEQUENCE` y `CRITERIUM_SYSTEM`. Las partes comerciales proceden de la misma fábrica que el flujo anterior. La creación desde el panel registra una sola acción `CREATE_OBJECTS` para la secuencia o el sistema completos; la duplicación de una secuencia en un sistema registra una sola acción `CRITERIUM_SYSTEM_DUPLICATE_SEQUENCE`. Las operaciones de agregar y retirar usan el historial de Fase 2.

## Validación automatizada

`test/critteriumConfigurator.test.js` cubre validación previa, creación de secuencia con el resolver real, códigos comerciales equivalentes al flujo de frames existentes y sistema con IDs independientes. Las pruebas de persistencia y sistema de Fases 1 y 2 siguen activas.

Resultado final: pruebas enfocadas de configuración, sistema y persistencia 12/12; `npm test` 300/329, con 29 fallos preexistentes en Koncisa, LINK y Lockers; `npm run build` pasa; `git diff --check` pasa. El lint de los archivos nuevos y de Properties pasa. El lint ampliado señala variables sin uso y una regla de Fast Refresh en `LeftPanel.jsx`, además de una variable sin uso en `ThreeCanvas.jsx`; todos esos hallazgos ya estaban en `HEAD` y no corresponden al configurador.

## Recorrido manual pendiente

1. Left Panel → CRITTERIUM → Secuencia: configurar dos o tres frames, crear, seleccionar, mover y editar un frame en Properties.
2. Left Panel → Sistema: crear dos secuencias, seleccionar sistema y secuencia, mover ambos niveles.
3. Duplicar una secuencia en el sistema; comprobar configuración e IDs nuevos. Deshacer y rehacer en un gesto.
4. Crear un sistema desde dos secuencias existentes; agregar y retirar otra secuencia.
5. Guardar, cerrar y abrir; comparar sistema, secuencias, frames, junctions, posiciones y BOM.
6. Repetir la creación antigua desde Properties y comparar códigos y cantidades comerciales.

El entorno de pruebas automatizadas no ejecuta gestos de la interfaz ni la aplicación Electron. Estos pasos requieren ejecución manual antes de declarar validada la experiencia completa.
