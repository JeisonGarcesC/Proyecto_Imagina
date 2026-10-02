import { Vector3, Quaternion } from 'three';
import { toWorldUnitsFromCm } from './multipleSpatialUnits.js';

// Coordinates are relative to the centered MULTIPLE_PRODUCT root, in metres.
export function getMultipleProductConnectionPoints(productOrConfig, ownerId = null) {
  const config = productOrConfig?.userData?.config || productOrConfig?.config || productOrConfig;
  const id = ownerId || productOrConfig?.userData?.instanceId || productOrConfig?.instanceId || null;
  const halfWidth = toWorldUnitsFromCm(config?.widthCm || 0) / 2;
  return [
    { id: 'LEFT', ownerId: id, type: 'LINEAR_START', positionLocal: [-halfWidth, 0, 0], directionLocal: [-1, 0, 0], normalLocal: [0, 0, 1], connectionRole: 'LEFT', connectionType: 'LINEAR_START' },
    { id: 'RIGHT', ownerId: id, type: 'LINEAR_END', positionLocal: [halfWidth, 0, 0], directionLocal: [1, 0, 0], normalLocal: [0, 0, 1], connectionRole: 'RIGHT', connectionType: 'LINEAR_END' },
  ];
}

export function getMultipleProductWorldConnectionPoints(product) {
  product.updateMatrixWorld(true);
  const orientation = product.getWorldQuaternion(new Quaternion());
  return getMultipleProductConnectionPoints(product).map((point) => ({
    ...point,
    positionWorld: product.localToWorld(new Vector3(...point.positionLocal)).toArray(),
    directionWorld: new Vector3(...point.directionLocal).applyQuaternion(orientation).toArray(),
    normalWorld: new Vector3(...point.normalLocal).applyQuaternion(orientation).toArray(),
  }));
}
