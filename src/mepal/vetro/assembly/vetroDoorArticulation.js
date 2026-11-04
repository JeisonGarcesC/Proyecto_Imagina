import { Group, MathUtils, Vector3 } from 'three';

export const DEFAULT_VETRO_DOOR_STATE = Object.freeze({ hand: 'LH', swing: 'FRONT', angleDeg: 0 });

export function normalizeVetroDoorState(state = {}) {
  const angle = Number(state.angleDeg);
  return {
    hand: state.hand === 'RH' ? 'RH' : 'LH',
    swing: state.swing === 'BACK' ? 'BACK' : 'FRONT',
    angleDeg: Number.isFinite(angle) ? Math.max(0, Math.min(90, angle)) : 0,
  };
}

function findNativeLeaf(assembly) {
  const leaf = assembly?.children.find((child) => child.userData?.config?.productType === 'DOOR_LEAF');
  return { leaf, native: leaf?.children.find((child) => child.userData?.visualSource === 'NATIVE') };
}

function glassEdge(mesh, side) {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  return mesh.position.x + (side === 'LEFT' ? box.min.x : box.max.x) * mesh.scale.x;
}

export function getVetroDoorFloorStop(assembly) {
  return assembly?.children.find((child) => child.userData?.kind === 'VETRO_PRODUCT' && child.userData?.code === '22013883') || null;
}

export function getVetroDoorFloorStopPoint(assembly) {
  const stop = getVetroDoorFloorStop(assembly);
  if (!stop) return null;
  const position = stop.getWorldPosition(new Vector3());
  return [position.x, position.z];
}

export function moveVetroDoorFloorStopToWorld(assembly, x, z) {
  const stop = getVetroDoorFloorStop(assembly);
  if (!stop || !Number.isFinite(x) || !Number.isFinite(z)) return false;
  assembly.updateMatrixWorld(true);
  const world = stop.getWorldPosition(new Vector3());
  world.x = x;
  world.z = z;
  stop.position.copy(assembly.worldToLocal(world));
  stop.userData.floorStopPlacement = { ...stop.userData.floorStopPlacement, mode: 'MANUAL', targetAngleDeg: 90, provisional: true };
  stop.updateMatrixWorld(true);
  return true;
}

function placeFloorStop(assembly, native, state) {
  const stop = getVetroDoorFloorStop(assembly);
  if (!stop) return;
  if (stop.userData.floorStopPlacement?.mode === 'MANUAL') return;
  const pivots = native.children.filter((child) => child.userData?.vetroDoorPivot);
  // One commercial stop is represented by one physical component, also on double doors.
  const pivot = pivots.find((child) => child.userData.vetroDoorPivot === 'LEFT') || pivots[0];
  const glass = pivot?.children.find((child) => child.name.startsWith('DOOR_LEAF'));
  if (!glass) return;
  glass.geometry.computeBoundingBox();
  const width = (glass.geometry.boundingBox.max.x - glass.geometry.boundingBox.min.x) * Math.abs(glass.scale.x);
  assembly.updateMatrixWorld(true);
  const hinge = assembly.worldToLocal(pivot.getWorldPosition(new Vector3()));
  // The installation point is the leaf tip at the supported 90-degree opening.
  // The live angle only rotates the leaf: the floor-mounted stop remains stationary.
  stop.position.set(hinge.x, 0, hinge.z + (state.swing === 'FRONT' ? -width : width));
  stop.rotation.set(0, state.swing === 'FRONT' ? 0 : Math.PI, 0);
  stop.userData.floorStopPlacement = { mode: 'AUTO', targetAngleDeg: 90, provisional: true };
}

// The pivot is placed on the existing visual leaf edge. Its exact hardware offset is undocumented.
export function applyVetroDoorState(assembly, requestedState = assembly?.userData?.doorState) {
  if (assembly?.userData?.kind !== 'VETRO_ASSEMBLY') return false;
  const state = normalizeVetroDoorState(requestedState);
  const { leaf, native } = findNativeLeaf(assembly);
  if (!leaf || !native) return false;
  const isDouble = leaf.userData.config?.variant === 'DOUBLE';

  // Return the visual to its closed native coordinates before changing its hand or swing.
  for (const pivot of [...native.children].filter((child) => child.userData?.vetroDoorPivot)) {
    pivot.rotation.y = 0;
    pivot.updateMatrixWorld(true);
    for (const child of [...pivot.children]) native.attach(child);
    native.remove(pivot);
  }
  const glasses = [...native.children].filter((child) => child.name.startsWith('DOOR_LEAF'));
  if (glasses.length !== (isDouble ? 2 : 1)) return false;

  const sides = isDouble ? ['LEFT', 'RIGHT'] : [state.hand === 'RH' ? 'RIGHT' : 'LEFT'];
  for (const side of sides) {
    const glass = isDouble ? glasses.find((item) => item.name === `DOOR_LEAF_${side}`) : glasses[0];
    if (!glass) return false;
    const pivot = new Group();
    pivot.name = `DOOR_HINGE_PIVOT_${side}`;
    pivot.userData.vetroDoorPivot = side;
    pivot.position.x = glassEdge(glass, side);
    native.add(pivot);
    pivot.attach(glass);
    const suffix = isDouble ? `_${side}` : '_SINGLE';
    for (const hardware of [...native.children].filter((child) => child.isMesh && child.name.endsWith(suffix))) {
      if (!isDouble) {
        // The old native visual has left-hand hardware; mirror it around the leaf centre.
        hardware.userData.closedLeftHandX ??= hardware.position.x;
        hardware.position.x = hardware.userData.closedLeftHandX * (state.hand === 'RH' ? -1 : 1);
      }
      pivot.attach(hardware);
    }
    const direction = side === 'LEFT' ? 1 : -1;
    pivot.rotation.y = MathUtils.degToRad(state.angleDeg) * direction * (state.swing === 'FRONT' ? 1 : -1);
  }
  assembly.userData.doorState = state;
  native.updateMatrixWorld(true);
  placeFloorStop(assembly, native, state);
  return true;
}

export function getVetroDoorLeafSegments(assembly) {
  const { native } = findNativeLeaf(assembly);
  if (!native) return [];
  const segments = [];
  for (const pivot of native.children.filter((child) => child.userData?.vetroDoorPivot)) {
    const glass = pivot.children.find((child) => child.name.startsWith('DOOR_LEAF'));
    if (!glass) continue;
    glass.geometry.computeBoundingBox();
    const width = glass.geometry.boundingBox.max.x - glass.geometry.boundingBox.min.x;
    const left = pivot.userData.vetroDoorPivot === 'LEFT';
    const hinge = glass.localToWorld(new Vector3(left ? -width / 2 : width / 2, 0, 0));
    const free = glass.localToWorld(new Vector3(left ? width / 2 : -width / 2, 0, 0));
    segments.push({ side: pivot.userData.vetroDoorPivot, start: [hinge.x, hinge.z], end: [free.x, free.z] });
  }
  return segments;
}
