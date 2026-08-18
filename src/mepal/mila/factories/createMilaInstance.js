import { buildMila } from '../builders/MilaBuilder';
import * as THREE from 'three';
import {
  MILA_ALIGN_TUNE,
  MILA_SINGLE_SEAT_MODE_OFFSETS_MM,
  resolveMilaBeamSpanRatio,
} from '../config/milaTunables';

function defaultNotify(message) {
  globalThis.alert?.(message);
}

function getBounds(object) {
  if (!object) return null;
  const box = new THREE.Box3().setFromObject(object);
  if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) return null;
  return box;
}

function getCenter(bounds) {
  if (!bounds) return null;
  return new THREE.Vector3(
    (bounds.min.x + bounds.max.x) / 2,
    (bounds.min.y + bounds.max.y) / 2,
    (bounds.min.z + bounds.max.z) / 2
  );
}

function shiftObject(object, dx = 0, dy = 0, dz = 0) {
  if (!object) return;
  object.position.x += dx;
  object.position.y += dy;
  object.position.z += dz;
  object.updateMatrixWorld?.(true);
}

function snapAssemblyToGridTop(assembly) {
  if (!assembly) return;
  assembly.updateMatrixWorld?.(true);

  const bounds = getBounds(assembly);
  if (!bounds) return;

  const minY = Number(bounds.min.y);
  if (!Number.isFinite(minY)) return;

  // Eleva todo el ensamble para que su punto más bajo quede en Y=0 (sobre la cuadrícula).
  if (minY < 0) {
    shiftObject(assembly, 0, -minY, 0);
  }
}

function orientBeamLongAxisToX(beamObj) {
  if (!beamObj) return;

  const beamBounds = getBounds(beamObj);
  if (!beamBounds) return;

  const beamSize = new THREE.Vector3();
  beamBounds.getSize(beamSize);

  if (beamSize.y > beamSize.x && beamSize.y > beamSize.z) {
    beamObj.rotation.z += Math.PI / 2;
    beamObj.updateMatrixWorld?.(true);
    return;
  }

  if (beamSize.z > beamSize.x && beamSize.z > beamSize.y) {
    beamObj.rotation.y += Math.PI / 2;
    beamObj.updateMatrixWorld?.(true);
  }
}

function scaleBeamToSpanX(beamObj, spanX, quantity) {
  if (!beamObj) return;

  const normalizedBounds = getBounds(beamObj);
  if (!normalizedBounds) return;

  const beamWidthX = Math.max(0.001, normalizedBounds.max.x - normalizedBounds.min.x);
  const beamSpanRatio = resolveMilaBeamSpanRatio(quantity);
  const requestedScaleX = (spanX * beamSpanRatio) / beamWidthX;
  const scaleX = THREE.MathUtils.clamp(
    requestedScaleX,
    0.7,
    Math.max(1, Number(MILA_ALIGN_TUNE.BEAM_SCALE_X_MAX) || 8)
  );

  beamObj.scale.x *= scaleX;
  beamObj.updateMatrixWorld?.(true);
}

function resolveCenterSupportTargetX({ seatBoundEntries, quantity }) {
  if (!seatBoundEntries?.length || quantity < 3) return null;

  const getSeatCenterX = (seatIndex) => {
    const entry = seatBoundEntries[seatIndex];
    const center = getCenter(entry?.bounds);
    return Number.isFinite(center?.x) ? center.x : null;
  };

  if (quantity === 3) {
    return getSeatCenterX(1);
  }

  const seat2X = getSeatCenterX(1);
  const seat3X = getSeatCenterX(2);
  if (Number.isFinite(seat2X) && Number.isFinite(seat3X)) {
    return (seat2X + seat3X) / 2;
  }

  return seat2X;
}

function spreadMiddleBeamTargets(beamTargets) {
  if (!Array.isArray(beamTargets) || beamTargets.length !== 4) return beamTargets;

  const middleSpread = Number(MILA_ALIGN_TUNE.BEAM_MIDDLE_SPREAD_M) || 0;
  if (!middleSpread) return beamTargets;

  return [
    beamTargets[0],
    beamTargets[1] - middleSpread,
    beamTargets[2] + middleSpread,
    beamTargets[3],
  ];
}

function resolveBeamTargetPositions(frontZ, backZ, beamCount) {
  const normalizedCount = Math.max(2, Math.trunc(Number(beamCount) || 2));

  if (normalizedCount === 2) {
    return [frontZ, backZ];
  }

  const step = (backZ - frontZ) / (normalizedCount - 1);
  return Array.from({ length: normalizedCount }, (_unused, index) => frontZ + step * index);
}

function resolveMilaSeatModeOffsetMm(mode) {
  return MILA_SINGLE_SEAT_MODE_OFFSETS_MM[String(mode || '').trim()] ||
    MILA_SINGLE_SEAT_MODE_OFFSETS_MM.chair ||
    { x: 0, y: 0, z: 0 };
}

function resolveCenterSupportTargetZs(targetZ, supportCount, beamTargets) {
  const normalizedCount = Math.max(1, Math.trunc(Number(supportCount) || 1));
  if (normalizedCount === 1) return [targetZ];

  if (normalizedCount === 2 && Array.isArray(beamTargets) && beamTargets.length >= 4) {
    const firstGapMid = (beamTargets[0] + beamTargets[1]) / 2;
    const secondGapMid = (beamTargets[2] + beamTargets[3]) / 2;
    const spread = Math.max(0, Number(MILA_ALIGN_TUNE.DOUBLE_CENTER_SUPPORT_SPREAD_M) || 0);

    return [firstGapMid - spread, secondGapMid + spread];
  }

  const spread = Math.max(0, Number(MILA_ALIGN_TUNE.DOUBLE_CENTER_SUPPORT_SPREAD_M) || 0);
  if (!spread) return Array.from({ length: normalizedCount }, () => targetZ);

  if (normalizedCount === 2) {
    return [targetZ - spread, targetZ + spread];
  }

  const first = targetZ - spread;
  const last = targetZ + spread;
  const step = (last - first) / (normalizedCount - 1);
  return Array.from({ length: normalizedCount }, (_unused, index) => first + step * index);
}

function alignMilaModule(moduleParts) {
  const seats = Array.isArray(moduleParts?.seats) ? moduleParts.seats.filter(Boolean) : [];
  const leftLegObj = moduleParts?.leftLeg || null;
  const rightLegObj = moduleParts?.rightLeg || null;
  const centerSupportObjects = Array.isArray(moduleParts?.centerSupports)
    ? moduleParts.centerSupports.filter(Boolean)
    : [];
  const beamObjects = Array.isArray(moduleParts?.beams) ? moduleParts.beams.filter(Boolean) : [];

  if (!seats.length || !leftLegObj || !rightLegObj) return;

  seats.forEach((seat) => seat.updateMatrixWorld?.(true));
  leftLegObj.updateMatrixWorld?.(true);
  rightLegObj.updateMatrixWorld?.(true);

  const seatBoundEntries = seats
    .map((seat) => ({ seat, bounds: getBounds(seat) }))
    .filter((entry) => !!entry.bounds)
    .sort((a, b) => {
      const ca = getCenter(a.bounds);
      const cb = getCenter(b.bounds);
      return (ca?.x || 0) - (cb?.x || 0);
    });

  if (!seatBoundEntries.length) return;

  const seatBounds = seatBoundEntries[0].bounds;
  const quantity = Math.max(1, Number(moduleParts?.quantity) || seatBoundEntries.length);
  const anchorSeatIndex = Math.max(0, quantity - 1);
  const rightSeatBounds = seatBoundEntries[Math.min(anchorSeatIndex, seatBoundEntries.length - 1)].bounds;

  const leftBounds = getBounds(leftLegObj);
  const rightBounds = getBounds(rightLegObj);
  if (!seatBounds || !leftBounds || !rightBounds) return;

  const leftCenter = getCenter(leftBounds);
  const rightCenter = getCenter(rightBounds);
  const leftSeatCenter = getCenter(seatBounds);
  const rightSeatCenter = getCenter(rightSeatBounds);
  if (!leftCenter || !rightCenter || !leftSeatCenter || !rightSeatCenter) return;

  const leftWidth = leftBounds.max.x - leftBounds.min.x;
  const rightWidth = rightBounds.max.x - rightBounds.min.x;

  const targetLeftCenterX = seatBounds.min.x + leftWidth * MILA_ALIGN_TUNE.LEG_INSET_FACTOR;
  const targetRightCenterX = rightSeatBounds.max.x - rightWidth * MILA_ALIGN_TUNE.LEG_INSET_FACTOR;

  shiftObject(leftLegObj, targetLeftCenterX - leftCenter.x, 0, 0);
  shiftObject(rightLegObj, targetRightCenterX - rightCenter.x, 0, 0);

  const leftAfter = getBounds(leftLegObj);
  const rightAfter = getBounds(rightLegObj);
  if (!leftAfter || !rightAfter) return;

  const leftAfterCenter = getCenter(leftAfter);
  const rightAfterCenter = getCenter(rightAfter);
  if (!leftAfterCenter || !rightAfterCenter) return;

  const targetZ = (leftSeatCenter.z + rightSeatCenter.z) / 2;
  shiftObject(leftLegObj, 0, 0, targetZ - leftAfterCenter.z);
  shiftObject(rightLegObj, 0, 0, targetZ - rightAfterCenter.z);
  shiftObject(leftLegObj, 0, -MILA_ALIGN_TUNE.LEG_DROP_M, 0);
  shiftObject(rightLegObj, 0, -MILA_ALIGN_TUNE.LEG_DROP_M, 0);

  const leftFinal = getBounds(leftLegObj);
  const rightFinal = getBounds(rightLegObj);
  if (!leftFinal || !rightFinal) return;

  const innerLeftX = leftFinal.max.x;
  const innerRightX = rightFinal.min.x;
  const spanX = Math.max(0.05, innerRightX - innerLeftX);

  const frontZBase =
    Math.min(leftFinal.min.z, rightFinal.min.z) + MILA_ALIGN_TUNE.BEAM_INSET_FROM_LEG_Z_M;
  const backZBase =
    Math.max(leftFinal.max.z, rightFinal.max.z) - MILA_ALIGN_TUNE.BEAM_INSET_FROM_LEG_Z_M;
  const maxCloser = Math.max(0, (backZBase - frontZBase) * 0.45);
  const pairCloser = Math.min(MILA_ALIGN_TUNE.BEAM_PAIR_CLOSER_M, maxCloser);
  const frontZ = frontZBase + pairCloser;
  const backZ = backZBase - pairCloser;
  const beamY = Math.max(leftFinal.max.y, rightFinal.max.y) - MILA_ALIGN_TUNE.BEAM_TOP_Y_OFFSET_M;
  const beamTargetX = (innerLeftX + innerRightX) / 2;

  // Re-centra los asientos de Mila simple (mesa/grommet) para que queden en la mitad del soporte.
  seatBoundEntries.forEach(({ seat, bounds }) => {
    const center = getCenter(bounds);
    if (!center) return;

    const role = String(seat?.userData?.meta?.role || '').toLowerCase();
    if (role !== 'seat') return;

    const line = String(seat?.userData?.line || '').toUpperCase();
    if (line !== 'MILA') return;

    const seatMode = String(seat?.userData?.meta?.seatMode || 'chair');
    const modeOffsetMm = resolveMilaSeatModeOffsetMm(seatMode);
    const targetSeatZ = targetZ + Number(modeOffsetMm?.z || 0) / 1000;

    shiftObject(seat, 0, 0, targetSeatZ - center.z);
  });
  const beamTargets = spreadMiddleBeamTargets(
    resolveBeamTargetPositions(frontZ, backZ, beamObjects.length || 2)
  );

  if (centerSupportObjects.length) {
    const targetSupportX = resolveCenterSupportTargetX({ seatBoundEntries, quantity });
    const leftLegCenterAfterDrop = getCenter(leftFinal);
    const rightLegCenterAfterDrop = getCenter(rightFinal);
    const supportTargetZs = resolveCenterSupportTargetZs(
      targetZ,
      centerSupportObjects.length,
      beamTargets
    )
      .slice()
      .sort((a, b) => a - b);

    if (Number.isFinite(targetSupportX) && leftLegCenterAfterDrop && rightLegCenterAfterDrop) {
      const targetSupportY = (leftLegCenterAfterDrop.y + rightLegCenterAfterDrop.y) / 2;

      const orderedSupports = centerSupportObjects
        .map((obj) => {
          obj.updateMatrixWorld?.(true);
          const bounds = getBounds(obj);
          const center = getCenter(bounds);
          return { obj, center };
        })
        .filter((entry) => !!entry.center)
        .sort((a, b) => a.center.z - b.center.z);

      orderedSupports.forEach((entry, index) => {
        const targetSupportZ = supportTargetZs[Math.min(index, supportTargetZs.length - 1)];
        shiftObject(
          entry.obj,
          targetSupportX - entry.center.x,
          targetSupportY - entry.center.y,
          targetSupportZ - entry.center.z
        );
      });
    }
  }

  const placeBeam = (beamObj, targetZPos, side) => {
    if (!beamObj) return;
    beamObj.updateMatrixWorld?.(true);

    orientBeamLongAxisToX(beamObj);
    scaleBeamToSpanX(beamObj, spanX, quantity);

    const scaledBounds = getBounds(beamObj);
    const scaledCenter = getCenter(scaledBounds);
    if (!scaledBounds || !scaledCenter) return;

    const targetEdgeZ =
      side === 'front'
        ? targetZPos - scaledBounds.max.z
        : side === 'back'
          ? targetZPos - scaledBounds.min.z
          : targetZPos - scaledCenter.z;

    const targetEdgeY = beamY - scaledBounds.max.y;

    shiftObject(
      beamObj,
      beamTargetX - scaledCenter.x,
      targetEdgeY,
      targetEdgeZ
    );
  };

  beamObjects.forEach((beamObj, index) => {
    const targetZPos = beamTargets[Math.min(index, beamTargets.length - 1)];
    const side = index === 0 ? 'front' : index === beamObjects.length - 1 ? 'back' : 'middle';
    placeBeam(beamObj, targetZPos, side);
  });
}

export async function createMilaInstance({ api, config, parent = null, notify = defaultNotify } = {}) {
  if (!api) throw new TypeError('createMilaInstance requires the ThreeCanvas API.');
  if (!config || typeof config !== 'object') {
    throw new TypeError('createMilaInstance requires a configuration object.');
  }

  const built = buildMila(config);
  const { groupId, groupName, parts = [] } = built || {};

  const assembly =
    api.createMilaAssemblyGroup?.({
      ...config,
      groupId,
      groupName,
    }) || null;

  if (!assembly) {
    notify('No se pudo crear el grupo de Mila.');
    return null;
  }

  if (parent && assembly.parent !== parent) parent.add?.(assembly);

  const modules = new Map();
  modules.set(0, {
    quantity: built.quantity,
    seats: [],
    leftLeg: null,
    rightLeg: null,
    centerSupports: [],
    beams: [],
  });

  for (const part of parts) {
    if (!part?.code || !part?.model?.src) {
      notify(`No tenemos disponible esta parte de Mila: ${part?.logicalCode || 'sin código'}`);
      continue;
    }

    const createdObj = await api.addExternalGlbPart?.({
      ...part,
      groupId: part.groupId || groupId,
      groupName: part.groupName || groupName,
      parentGroup: assembly,
    });

    if (!createdObj) continue;

    const moduleParts = modules.get(0);
    const role = String(part?.meta?.role || '').toLowerCase();
    if (role === 'seat') moduleParts.seats.push(createdObj);
    if (role === 'leg-left') moduleParts.leftLeg = createdObj;
    if (role === 'leg-right') moduleParts.rightLeg = createdObj;
    if (role.startsWith('leg-center-support')) moduleParts.centerSupports.push(createdObj);
    if (role.startsWith('beam')) moduleParts.beams.push(createdObj);
  }

  modules.forEach((moduleParts) => alignMilaModule(moduleParts));

  snapAssemblyToGridTop(assembly);

  assembly.updateMatrixWorld?.(true);

  api.selectObject?.(assembly);

  return {
    assembly,
    groupId,
    groupName,
    parts,
    quantity: built.quantity,
  };
}
