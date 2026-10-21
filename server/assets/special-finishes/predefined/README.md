# Texturas predeterminadas de Acabados Especiales

Los PNG de `walls/` y `floors/` son patrones originales generados localmente mediante
`server/scripts/generatePredefinedTextures.js` (ocho originales) y
`server/scripts/extendPredefinedCatalog.js` (32 adicionales). Su origen y licencia se indican
en cada entrada del manifiesto: `GENERATED_LOCALLY`, `Proyecto Imagina original`. No proceden
de Materiales ni de uploads de usuario. Son archivos de 512 × 512 píxeles con previews de
128 × 128 píxeles. El generador adicional usa nombres nuevos y no sobrescribe PNG existentes.
Este directorio no se publica como estático: el router autenticado sirve las imágenes por `assetId`.

`manifest.json` es el catálogo oficial. Cada acabado conserva un `id` estable. Para una nueva
revisión, agregar una entrada a `revisions` con un `assetId` nuevo, un nombre de archivo nuevo y
una preview nueva. Conservar todas las entradas y archivos anteriores: los proyectos guardados
referencian el `assetId` y `assetVersion` originales.

Las texturas de categoría `FLOOR` se muestran en el catálogo, pero no se aplican a pisos hasta
que exista un motor de acabados arquitectónicos para esa entidad.
