export function serializeLockerEntity(object) {
  const d = object.userData;
  return { kind: 'LOCKER_PRODUCT', family: 'LOCKERS', instanceId: d.instanceId, groupId: d.groupId,
    codigoPT: d.codigoPT, code: d.codigoPT, config: JSON.parse(JSON.stringify(d.config)),
    bays: JSON.parse(JSON.stringify(d.bays)),
    transform: { position: object.position.toArray(), quaternion: object.quaternion.toArray(),
      rotation: [object.rotation.x, object.rotation.y, object.rotation.z], scale: object.scale.toArray() },
    metadata: { line: 'LOCKERS', visualSource: 'NATIVE', renderStatus: d.renderStatus } };
}
