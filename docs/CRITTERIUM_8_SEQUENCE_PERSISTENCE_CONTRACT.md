# Contrato de persistencia de secuencias CRITTERIUM 8

## Estado comprobado antes de esta fase

Una secuencia se crea desde frames ya registrados. `prepareCritterium8Sequence` resuelve sus extremos y junctions; `registerCritterium8Sequence` adjunta la raíz y registra la relación `parentSequenceId`. El historial ya registra crear, reconstruir, disolver, agregar y quitar frame como operaciones lógicas. El guardado anterior serializaba cada frame, pero la raíz de secuencia caía en el serializador genérico como `PART`; no existía un loader de secuencia. Por tanto, la relación y los junctions no tenían una ruta de restauración fiable.

## Entidades y responsabilidades de IDs

| ID | Propietario | Función |
| --- | --- | --- |
| `sequenceId` | raíz `CRITTERIUM_8_SEQUENCE_ASSEMBLY` | Identidad de la secuencia; también se usa como `instanceId` de su raíz 3D. |
| `frameId` | frame | Referencia de conexión y membresía en la secuencia. |
| `assemblyId` | frame | Identidad de su assembly físico. |
| `instanceId` | frame | Identidad de la instancia configurable. |
| `groupId` | frame | Agrupación existente; no equivale necesariamente a `sequenceId`. |
| `partId` | parte física | Identidad derivada de la definición del frame; no se serializa como entidad independiente. |
| `junctionId` | junction | Identidad determinista basada en `sequenceId` y extremos conectados. |

`sequenceId` e `instanceId` tienen el mismo valor en la raíz de secuencia actual. No se migran ni se renombran en esta fase.

## Guardado

Cada frame sigue siendo una entidad `CRITTERIUM_8` independiente con su configuración e IDs. Su transformación se guarda en coordenadas de mundo para que la jerarquía temporal de la secuencia no cambie su ubicación al abrir. La nueva entidad `CRITTERIUM_8_SEQUENCE` guarda `sequenceId`, `frameIds`, `junctionIds`, `connections` (aristas del grafo actual), definición de secuencia y transformación de raíz. No contiene copias de los frames ni meshes.

## Carga

Se cargan primero las entidades ordinarias y después las secuencias. El loader busca frames por `frameId`; no crea frames sustitutos. Reconstruye la geometría y junctions con el resolver CRITTERIUM existente en el espacio local de la secuencia, comprueba IDs de junctions y conexiones, aplica la transformación guardada y registra la raíz y sus pickables. La carga no registra una acción de Undo/Redo.

Si faltan frames o los junctions o conexiones calculados no coinciden, la secuencia no se registra y se informa un diagnóstico. Los frames disponibles permanecen independientes. No se inventan junctions de una relación incompleta.

## Proyectos anteriores

Los proyectos con frames individuales continúan cargando por la ruta `CRITTERIUM_8`. Algunas versiones antiguas pudieron guardar una raíz de secuencia como `PART` con un código `C8_SEQUENCE_*`, sin `frameIds` ni topología: ese registro se omite con `CRITTERIUM_SEQUENCE_LEGACY_RELATION_MISSING` y se conservan los frames. Una raíz antigua con un ID personalizado que no siga ese prefijo no puede identificarse con certeza a partir del registro genérico; no se infiere una secuencia por proximidad.

## Evolución futura

Hay dos modelos posibles: (1) la secuencia como primer tipo de sistema configurable; (2) `CRITERIUM_SYSTEM` como capa superior que agrupe una o varias secuencias. La estructura actual de `FrameSequence` y sus junctions favorece inicialmente el primer modelo para sistemas lineales o conectados. Una oficina con varias secuencias independientes favorecería una capa superior. Esta fase no elige ni implementa ese modelo; el contrato persistente de secuencia permite evaluar ambos sin acoplar CRITTERIUM a MULTIPLE.
