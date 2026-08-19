// src/mepal/kuoGo/factories/createKuoGoInstance.js
import { buildKuoGo } from '../builders/KuoGoBuilder';

export async function createKuoGoInstance({ config, loadGlb, country = 'CO' } = {}) {
  if (typeof loadGlb !== 'function') {
    throw new TypeError('createKuoGoInstance: se requiere la función loadGlb.');
  }

  const built = buildKuoGo(config);

  if (built?.error) {
    console.warn('[createKuoGoInstance]', built.error);
    return null;
  }

  const { groupId, groupName, parts } = built;

  if (!parts || parts.length === 0) {
    console.warn('[createKuoGoInstance] El builder no generó piezas.');
    return null;
  }

  const part = parts[0];

  let loaded;
  try {
    loaded = await loadGlb([part.src]);
  } catch (err) {
    throw new Error(`[createKuoGoInstance] No se pudo cargar "${part.src}": ${err.message}`);
  }

  const object = loaded?.scene || loaded?.object || loaded || null;
  if (!object) {
    throw new Error(`[createKuoGoInstance] El GLB no devolvió un objeto 3D: ${part.src}`);
  }

  const metadata = {
    kind:       'KUOGO',
    groupId,
    groupName,
    codigoPT:   part.codigo,
    instanceId: part.instanceId,
    tipoKey:    part.tipoKey,
    espesor:    part.espesor,
    especial:   part.especial,
    label:      part.label,
    kuoGoParts: [
      {
        code:        part.codigo,
        description: part.label,
        qty:         1,
        espesor:     part.espesor,
        especial:    part.especial,
      },
    ],
  };

  object.userData = {
    ...(object.userData || {}),
    ...metadata,
    isPartRoot: true,
  };
  object.name = `KUOGO_${part.codigo}`;

  return {
    object,
    metadata,
    partRecord: {
      code: part.codigo,
      obj:  object,
    },
  };
}
