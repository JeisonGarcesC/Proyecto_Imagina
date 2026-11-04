import { Quaternion, Vector3 } from 'three';
import { resolveVetroConnectionPoints } from './vetroConnectionPoints.js';
import { VETRO_SNAP_CAPTURE_M } from './vetroSystemConnections.js';

export const VETRO_WALL_ARRIVAL_CONNECTION = 'WALL_ARRIVAL_TERMINATION';
const point = (values) => new Vector3(...values);

export function isVetroWallArrivalKit(product) {
  return product?.userData?.kind === 'VETRO_PRODUCT' &&
    product.userData.config?.productType === 'PROFILE' &&
    product.userData.config?.variant === 'WALL_ARRIVAL_KIT';
}

export function getVetroWallArrivalRelations(products = []) {
  return products.filter(isVetroWallArrivalKit).flatMap((product) => product.userData.externalConnections || []);
}

export function previewVetroWallArrivalSnap(product, systems = [], products = [product], additionalRelations = [], options = {}) {
  if (!isVetroWallArrivalKit(product)) return null;
  const captureM = Number(options.captureM ?? VETRO_SNAP_CAPTURE_M);
  const kitHeightMm = Number(product.userData.config.nominalLengthCm) * 10;
  const occupied = new Set([
    ...systems.flatMap((system) => system.userData?.externalConnections || []).flatMap((relation) => [
      `${relation.sourceSystemId}:${relation.sourceTerminalId}`,
      `${relation.targetSystemId}:${relation.targetTerminalId}`,
    ]),
    ...additionalRelations.map((relation) => `${relation.sourceSystemId}:${relation.sourceTerminalId}`),
    ...getVetroWallArrivalRelations(products).map((relation) => `${relation.sourceSystemId}:${relation.sourceTerminalId}`),
  ]);
  if ((product.userData.externalConnections || []).length) return null;
  const origin = product.getWorldPosition(new Vector3());
  let best = null;
  for (const system of systems) {
    if (system?.userData?.kind !== 'VETRO_SYSTEM' || Number(system.userData.heightMm) !== kitHeightMm) continue;
    for (const terminal of resolveVetroConnectionPoints(system).filter((item) => item.kind === 'TERMINAL')) {
      if (occupied.has(`${terminal.systemId}:${terminal.id}`)) continue;
      const distanceM = origin.distanceTo(point(terminal.position));
      if (distanceM > captureM || (best && distanceM >= best.distanceM)) continue;
      best = {
        sourceSystemId: terminal.systemId, sourceTerminalId: terminal.id,
        targetProductId: product.userData.instanceId,
        connectionType: VETRO_WALL_ARRIVAL_CONNECTION,
        distanceM, geometryStatus: 'PROVISIONAL_PROFILE_ORIGIN_AT_PANEL_TERMINAL',
      };
    }
  }
  return best;
}

export function connectVetroWallArrivalToSystem({ product, system, preview, systems = [system], products = [product], additionalRelations = [] } = {}) {
  if (!isVetroWallArrivalKit(product) || system?.userData?.kind !== 'VETRO_SYSTEM')
    return { success: false, reason: 'VETRO_WALL_ARRIVAL_AND_SYSTEM_REQUIRED' };
  const candidate = preview || previewVetroWallArrivalSnap(product, systems, products, additionalRelations);
  const available = previewVetroWallArrivalSnap(product, systems, products, additionalRelations);
  if (!candidate || !available || candidate.sourceSystemId !== system.userData.systemId ||
      candidate.sourceSystemId !== available.sourceSystemId ||
      candidate.sourceTerminalId !== available.sourceTerminalId || candidate.targetProductId !== product.userData.instanceId)
    return { success: false, reason: 'VETRO_WALL_ARRIVAL_TERMINAL_NOT_AVAILABLE' };
  const terminal = resolveVetroConnectionPoints(system).find((item) => item.id === candidate.sourceTerminalId && item.kind === 'TERMINAL');
  if (!terminal) return { success: false, reason: 'VETRO_WALL_ARRIVAL_TERMINAL_MISSING' };
  const outward = point(terminal.direction);
  // Local +X is the wall-facing side; the other side faces the panel.
  product.rotation.set(0, -Math.atan2(outward.z, outward.x), 0);
  const world = point(terminal.position);
  product.position.copy(product.parent ? product.parent.worldToLocal(world) : world);
  product.updateMatrixWorld(true);
  const relation = { ...candidate, connectionId: candidate.connectionId || `vetro-wall-arrival-${crypto.randomUUID()}` };
  product.userData.externalConnections = [relation];
  return { success: true, relation };
}

export function disconnectVetroWallArrival(product, connectionId) {
  if (!isVetroWallArrivalKit(product)) return false;
  const before = product.userData.externalConnections || [];
  product.userData.externalConnections = before.filter((relation) => relation.connectionId !== connectionId);
  return before.length !== product.userData.externalConnections.length;
}

export function isVetroWallArrivalAligned(product, relation, systems, toleranceM = 0.001) {
  const system = systems.find((item) => item.userData?.systemId === relation.sourceSystemId);
  const terminal = resolveVetroConnectionPoints(system).find((item) => item.id === relation.sourceTerminalId);
  if (!terminal) return false;
  const expectedDirection = point(terminal.direction);
  const actualDirection = new Vector3(1, 0, 0).applyQuaternion(product.getWorldQuaternion(new Quaternion()));
  return product.getWorldPosition(new Vector3()).distanceTo(point(terminal.position)) <= toleranceM &&
    actualDirection.dot(expectedDirection) >= 0.98;
}

export function captureVetroWallArrivalState(product) {
  return { position: product.position.toArray(), quaternion: product.quaternion.toArray(),
    externalConnections: structuredClone(product.userData.externalConnections || []) };
}

export function applyVetroWallArrivalState(product, state) {
  product.position.fromArray(state.position);
  product.quaternion.fromArray(state.quaternion);
  product.userData.externalConnections = structuredClone(state.externalConnections || []);
  product.updateMatrixWorld(true);
}

export function translateVetroConnectedWallArrivals(systems, products, deltaWorld) {
  const ids = new Set(systems.map((system) => system.userData?.systemId).filter(Boolean));
  const delta = deltaWorld.isVector3 ? deltaWorld : point(deltaWorld);
  const moved = products.filter((product) => isVetroWallArrivalKit(product) &&
    (product.userData.externalConnections || []).some((relation) => ids.has(relation.sourceSystemId)));
  for (const product of moved) {
    const world = product.getWorldPosition(new Vector3()).add(delta);
    product.position.copy(product.parent ? product.parent.worldToLocal(world) : world);
    product.updateMatrixWorld(true);
  }
  return moved;
}
