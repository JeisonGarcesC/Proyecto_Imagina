import * as THREE from 'three';

export const KUO_AV_CONFIGURATION_GAP_M = 0.5;

export function resolveKuoAVInsertionX(objects, incomingObject = null) {
  let rightEdge = null;
  for (const object of objects) {
    const kind = object?.userData?.kind;
    if (kind !== 'KUO_AV_ASSEMBLY' && kind !== 'KUO_AV_DOBLE_ASSEMBLY') continue;
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) continue;
    rightEdge = rightEdge === null ? box.max.x : Math.max(rightEdge, box.max.x);
  }
  if (rightEdge === null) return 0;

  let leftOffset = -0.6;
  if (incomingObject) {
    incomingObject.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(incomingObject);
    if (!box.isEmpty()) {
      leftOffset = box.min.x - incomingObject.getWorldPosition(new THREE.Vector3()).x;
    }
  }
  return rightEdge + KUO_AV_CONFIGURATION_GAP_M - leftOffset;
}
