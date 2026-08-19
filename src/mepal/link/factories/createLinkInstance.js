// src/mepal/link/factories/createLinkInstance.js
// ─────────────────────────────────────────────────────────────────────────────
// Carga el GLB de la credenza Link y devuelve el objeto 3D listo para insertar.
// Sigue el mismo patrón que createEdukInstance / createZenInstance:
//   - recibe `loadGlb` inyectada desde ThreeCanvas
//   - devuelve { object, metadata, partRecord }
// ─────────────────────────────────────────────────────────────────────────────

import { buildLink } from '../builders/LinkBuilder';
import { buildGLBPath } from '../config/linkTunables';

/**
 * Crea una instancia 3D de una credenza Link.
 *
 * @param {object}   options
 * @param {object}   options.config      - { tipoKey, entrega, ancho }
 * @param {Function} options.loadGlb     - función inyectada por ThreeCanvas
 * @param {string}   [options.country]   - código de país para BOM
 *
 * @returns {Promise<{ object, metadata, partRecord } | null>}
 *   Devuelve null si el tipo no está disponible (sin lanzar error).
 */
export async function createLinkInstance({ config, loadGlb, country = 'CO' } = {}) {
  if (typeof loadGlb !== 'function') {
    throw new TypeError('createLinkInstance: se requiere la función loadGlb.');
  }

  // 1. Resolver la pieza con el builder ────────────────────────────────────
  const built = buildLink(config);

  // Si el tipo no está disponible el builder devuelve { error }
  if (built?.error) {
    console.warn('[createLinkInstance]', built.error);
    return null;
  }

  const { groupId, groupName, parts } = built;

  if (!parts || parts.length === 0) {
    console.warn('[createLinkInstance] El builder no generó piezas.');
    return null;
  }

  // Link = 1 sola pieza por configuración
  const part = parts[0];

  // 2. Cargar el GLB ────────────────────────────────────────────────────────
  let loaded;
  try {
    loaded = await loadGlb([part.src]);
  } catch (err) {
    throw new Error(`[createLinkInstance] No se pudo cargar "${part.src}": ${err.message}`);
  }

  const object = loaded?.scene || loaded?.object || loaded || null;
  if (!object) {
    throw new Error(`[createLinkInstance] El GLB no devolvió un objeto 3D: ${part.src}`);
  }

  // 3. Metadatos ─────────────────────────────────────────────────────────────
  const metadata = {
    kind:       'LINK',
    groupId,
    groupName,
    codigoPT:   part.codigo,
    instanceId: part.instanceId,
    tipoKey:    part.tipoKey,
    entrega:    part.entrega,
    ancho:      part.ancho,
    label:      part.label,
    linkParts: [
      {
        code:        part.codigo,
        description: part.label,
        qty:         1,
        entrega:     part.entrega,
        ancho:       part.ancho,
      },
    ],
  };

  object.userData = {
    ...(object.userData || {}),
    ...metadata,
    isPartRoot: true,
  };
  object.name = `LINK_${part.codigo}_${part.entrega}_${part.ancho}`;

  return {
    object,
    metadata,
    partRecord: {
      code: part.codigo,
      obj:  object,
    },
  };
}
