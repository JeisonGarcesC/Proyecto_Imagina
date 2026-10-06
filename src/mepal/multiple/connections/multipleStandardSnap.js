import { Euler, Quaternion, Vector3 } from 'three';
import { previewMultipleSnap } from '../system/layout/MultipleSnapEngine.js';
import { getMultipleProductWorldConnectionPoints } from './multipleConnectionPoints.js';
import { MAGNETIC_SNAP_DISTANCE_MM, normalizeMultipleLayout } from '../system/layout/multipleLayoutTypes.js';

export { MAGNETIC_SNAP_DISTANCE_MM };
const linearPoints = ['START', 'END'];
const spatialRecord = (product) => product?.userData?.kind === 'MULTIPLE_PRODUCT' && product.parent?.userData?.kind !== 'MULTIPLE_SYSTEM';
const pointId = (id) => id === 'START' ? 'LEFT' : 'RIGHT';
const pairKey = (a, b) => [String(a), String(b)].sort().join('::');

export function getStandaloneMultipleProducts(scene) {
  const products = [];
  scene?.traverse((object) => { if (spatialRecord(object)) products.push(object); });
  return products;
}

function asSpatialModule(product) {
  product.updateMatrixWorld(true);
  const position = product.getWorldPosition(new Vector3());
  const rotation = new Euler().setFromQuaternion(product.getWorldQuaternion(new Quaternion()), 'YXZ');
  return { moduleId: product.userData.instanceId, config: product.userData.config,
    position: { x: position.x, y: position.y, z: position.z }, rotation: { y: rotation.y } };
}

export function previewMultipleStandardSnap(product, products, layout = {}) {
  if (!spatialRecord(product)) return null;
  const others = products.filter((item) => item !== product && spatialRecord(item));
  const candidate = previewMultipleSnap(asSpatialModule(product), others.map(asSpatialModule), layout,
    { allowedPointIds: linearPoints });
  if (!candidate) return null;
  const magneticStrength = candidate.status === 'GREEN'
    ? Math.max(0, 1 - candidate.distanceMm / MAGNETIC_SNAP_DISTANCE_MM) : 0;
  const current = product.getWorldPosition(new Vector3());
  const final = new Vector3(candidate.position.x, candidate.position.y, candidate.position.z);
  const owner = others.find((item) => item.userData.instanceId === candidate.targetModuleId);
  return { ...candidate, sourcePoint: pointId(candidate.sourcePoint), targetPoint: pointId(candidate.targetPoint),
    sourceWorldPosition: candidate.origin, targetWorldPosition: candidate.destination,
    originWorld: candidate.origin, destinationWorld: candidate.destination,
    finalPositionWorld: final.toArray(), magneticStrength,
    previewTransform: { positionWorld: current.lerp(final, magneticStrength).toArray() },
    targetProduct: owner };
}

export function getMultipleStandardConnections(products) {
  const records = new Map();
  products.filter(spatialRecord).forEach((product) => (product.userData.spatialConnections || []).forEach((connection) => {
    const key = pairKey(connection.from?.instanceId, connection.to?.instanceId);
    if (!records.has(key)) records.set(key, connection);
  }));
  return [...records.values()];
}

export function describeMultipleStandardSnap(product, products, layout = {}) {
  const preview = previewMultipleStandardSnap(product, products, layout);
  const sourcePoints = getMultipleProductWorldConnectionPoints(product);
  const distanceTo = (item) => {
    const targetPoints = getMultipleProductWorldConnectionPoints(item);
    return Math.min(...sourcePoints.flatMap((source) => targetPoints.map((point) =>
      new Vector3(...source.positionWorld).distanceTo(new Vector3(...point.positionWorld)) * 1000)));
  };
  const target = preview?.targetProduct || products.filter((item) => item !== product && spatialRecord(item))
    .map((item) => ({ item, distance: distanceTo(item) }))
    .sort((a, b) => a.distance - b.distance)[0]?.item;
  const targetPoints = target ? getMultipleProductWorldConnectionPoints(target) : [];
  const nearestDistanceMm = target ? distanceTo(target) : null;
  return { context: 'PRODUCT', ownerId: product.userData.instanceId, sourcePoints,
    targetOwnerId: target?.userData.instanceId || null, targetPoints,
    sourcePoint: preview?.sourcePoint || null, targetPoint: preview?.targetPoint || null,
    sourceWorldPosition: preview?.sourceWorldPosition || null,
    targetWorldPosition: preview?.targetWorldPosition || null,
    distanceMm: preview?.distanceMm ?? nearestDistanceMm,
    snapDistanceMm: normalizeMultipleLayout(layout).snapDistanceMm, magneticDistanceMm: MAGNETIC_SNAP_DISTANCE_MM,
    orientation: { sourceY: asSpatialModule(product).rotation.y, targetY: target ? asSpatialModule(target).rotation.y : null },
    height: { sourceCm: product.userData.config?.heightCm, targetCm: target?.userData.config?.heightCm },
    thickness: { sourceCm: product.userData.config?.thicknessCm, targetCm: target?.userData.config?.thicknessCm },
    compatible: preview?.status === 'GREEN', connectionId: preview?.connection?.connectionId || null,
    reason: preview?.reason || (preview ? null : target ? 'DISTANCE_TOO_FAR' : 'NO_CANDIDATE') };
}

export function commitMultipleStandardSnap(product, products, layout = {}) {
  if (!spatialRecord(product)) throw new Error('MULTIPLE_STANDARD_PRODUCT_REQUIRED');
  const standalones = products.filter(spatialRecord);
  const candidate = previewMultipleStandardSnap(product, standalones, layout);
  const sourceId = product.userData.instanceId;
  for (const owner of standalones) owner.userData.spatialConnections = (owner.userData.spatialConnections || []).filter((record) =>
    record.from?.instanceId !== sourceId && record.to?.instanceId !== sourceId);
  if (candidate?.status !== 'GREEN' || !candidate.targetProduct) return { candidate, connection: null };
  const final = new Vector3(...candidate.finalPositionWorld);
  if (product.parent) product.position.copy(product.parent.worldToLocal(final));
  else product.position.copy(final);
  product.updateMatrixWorld(true);
  const targetId = candidate.targetProduct.userData.instanceId;
  const connection = { id: `MULTIPLE:${pairKey(sourceId, targetId)}`, type: 'LINEAR',
    from: { instanceId: targetId, pointId: candidate.targetPoint },
    to: { instanceId: sourceId, pointId: candidate.sourcePoint } };
  const owner = standalones.find((item) => item.userData.instanceId === [sourceId, targetId].sort()[0]);
  owner.userData.spatialConnections = (owner.userData.spatialConnections || []).filter((record) =>
    pairKey(record.from?.instanceId, record.to?.instanceId) !== pairKey(sourceId, targetId));
  owner.userData.spatialConnections.push(connection);
  return { candidate, connection };
}
