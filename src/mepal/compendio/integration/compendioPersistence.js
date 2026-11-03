// src/mepal/compendio/integration/compendioPersistence.js
import { createCompendioInstance } from '../factories/createCompendioInstance.js';

export function serializeCompendioEntity(object) {
  const d = object.userData || {};
  return {
    kind: 'COMPENDIO_PRODUCT',
    family: 'COMPENDIO',
    instanceId: d.instanceId,
    groupId: d.groupId,
    config: d.config,
    transform: {
      position: object.position.toArray(),
      quaternion: object.quaternion.toArray(),
      scale: object.scale.toArray(),
    },
  };
}

export function deserializeCompendioEntity(entity) {
  const instance = createCompendioInstance({
    config: entity.config,
    instanceId: entity.instanceId,
    groupId: entity.groupId,
    transform: entity.transform,
  });
  return instance.object;
}
