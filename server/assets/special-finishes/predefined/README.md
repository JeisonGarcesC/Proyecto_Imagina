# Texturas predeterminadas de Acabados Especiales

Los PNG de `walls/` y `floors/` son patrones originales de prueba generados localmente mediante
`server/scripts/generatePredefinedTextures.js`. No proceden de Materiales ni de uploads de usuario.
Este directorio no se publica como estático: el router autenticado sirve las imágenes por `assetId`.

`manifest.json` es el catálogo oficial. Cada acabado conserva un `id` estable. Para una nueva
revisión, agregar una entrada a `revisions` con un `assetId` nuevo, un nombre de archivo nuevo y
una preview nueva. Conservar todas las entradas y archivos anteriores: los proyectos guardados
referencian el `assetId` y `assetVersion` originales.

Las texturas de categoría `FLOOR` se muestran en el catálogo, pero no se aplican a pisos hasta
que exista un motor de acabados arquitectónicos para esa entidad.
