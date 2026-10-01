# MULTIPLE Smart Layout: comprobación interactiva

Estado: pendiente de ejecución manual en la interfaz 3D. Las pruebas automatizadas de esta fase cubren identidad, snap, conexiones, colisiones, transformaciones y serialización; no simulan un mouse real en Electron.

| Paso | Acción manual | Resultado esperado | Resultado observado |
| --- | --- | --- | --- |
| 1 | Crear un `MULTIPLE_SYSTEM` con dos paneles. | Aparecen dos productos y una raíz de sistema. | Pendiente de comprobación visual. |
| 2 | Agregar otro panel desde el editor. | Se agrega un módulo con `moduleId` e `instanceId` propios. | Pendiente de comprobación visual. |
| 3 | Arrastrar un panel hacia otro. | Aparecen origen, destino y línea temporal; verde para snap válido, amarillo para ajuste pendiente, rojo para incompatible. | Pendiente de comprobación visual. |
| 4 | Soltar junto a un extremo compatible. | El panel queda alineado, la conexión aparece una vez y conserva sus IDs. | Prueba automatizada aprobada; pendiente de comprobación visual. |
| 5 | Deshacer y rehacer el movimiento. | Una sola acción restaura posición y conexión. | Pendiente de comprobación interactiva del historial. |
| 6 | Guardar el proyecto, cerrarlo y volver a abrirlo. | Posiciones locales, posición mundial, IDs y conexiones coinciden. | Prueba automatizada aprobada; pendiente del ciclo de interfaz. |
| 7 | Duplicar el sistema. | Nuevos IDs de sistema y módulos; misma configuración, acabados y cantidades de BOM. | Prueba automatizada aprobada; pendiente de comprobación visual. |
| 8 | Mover la raíz del sistema. | Todos los módulos y puntos auxiliares se desplazan juntos, con distancias internas constantes; una acción de historial. | Prueba automatizada de transformaciones aprobada; pendiente de comprobar el arrastre. |
| 9 | Acercar y atravesar dos módulos. | Contacto exacto válido; proximidad como `NEAR_COLLISION`; intersección como `COLLISION_REAL`. | Prueba automatizada aprobada; pendiente de comprobación visual. |

Para cerrar la validación manual, registrar fecha, sistema operativo, resultado de cada paso y cualquier captura o error observado.
