import { createLinkInstance } from '../factories/createLinkInstance.js';

export function serializeLinkEntity(object) {
  const d = object.userData;
  return { kind: 'LINK_PRODUCT', family: 'LINK', instanceId: d.instanceId, groupId: d.groupId,
    config: JSON.parse(JSON.stringify(d.config)),
    transform: { position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray() },
    metadata: { line: 'LINK', visualSource: 'NATIVE' } };
}

export function restoreLinkEntity(entity, { applyFinishes, loadAsset, onVisualReady } = {}) {
  if (!entity?.config || typeof entity.config !== 'object') throw new Error('LINK_MISSING_CONFIG');
  const instance = createLinkInstance({ config: entity.config, instanceId: entity.instanceId,
    groupId: entity.groupId, transform: entity.transform, applyFinishes, loadAsset, onVisualReady });
  if (!instance.success) throw new Error(instance.reason);
  return instance;
}
