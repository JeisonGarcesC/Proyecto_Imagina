import * as THREE from 'three';
import { buildMorea } from '../builders/MoreaBuilder.js';
import {
  MOREA_ALIGN_TUNE,
  MOREA_BUILDER_TUNE,
  MOREA_DOUBLE_BUILDER_TUNE,
  resolveMoreaPedestalModeByCode,
  resolveMoreaBeamSpanRatio,
  resolveMoreaDoubleCenterSupportOffsetsMm,
} from '../config/moreaTunables.js';

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
  const beamSpanRatio = resolveMoreaBeamSpanRatio(quantity);
  const requestedScaleX = (spanX * beamSpanRatio) / beamWidthX;
  const configuredMaxScaleX = Number(MOREA_ALIGN_TUNE.BEAM_SCALE_X_MAX);
  const maxScaleX =
    Number.isFinite(configuredMaxScaleX) && configuredMaxScaleX > 0
      ? Math.max(1, configuredMaxScaleX)
      : Number.POSITIVE_INFINITY;
  const scaleX = THREE.MathUtils.clamp(
    requestedScaleX,
    0.7,
    maxScaleX
  );

  beamObj.scale.x *= scaleX;
  beamObj.updateMatrixWorld?.(true);
}

function resolveBeamTargetPositions(frontZ, backZ, beamCount) {
  const normalizedCount = Math.max(2, Math.trunc(Number(beamCount) || 2));
  if (normalizedCount === 2) return [frontZ, backZ];

  if (normalizedCount === 4) {
    const span = Math.max(0, backZ - frontZ);
    const pairGap = Math.min(
      Math.max(0, Number(MOREA_ALIGN_TUNE.BEAM_SUPPORT_PAIR_GAP_M) || 0),
      span * 0.25
    );

    return [
      frontZ,
      frontZ + pairGap,
      backZ - pairGap,
      backZ,
    ];
  }

  const step = (backZ - frontZ) / (normalizedCount - 1);
  const targets = Array.from({ length: normalizedCount }, (_unused, index) => frontZ + step * index);
  const isDenseLayout = normalizedCount >= 6;

  const centerZ = (frontZ + backZ) / 2;
  const firstShift = Math.max(0, Number(MOREA_ALIGN_TUNE.BEAM_FIRST_VISIBLE_TO_CENTER_SHIFT_M) || 0);
  const lastShift = Math.max(0, Number(MOREA_ALIGN_TUNE.BEAM_LAST_VISIBLE_TO_CENTER_SHIFT_M) || 0);

  if (!isDenseLayout && firstShift > 0 && normalizedCount >= 3) {
    targets[0] = Math.min(centerZ, targets[0] + firstShift);
  }
  if (!isDenseLayout && lastShift > 0 && normalizedCount >= 3) {
    const lastIndex = normalizedCount - 1;
    targets[lastIndex] = Math.max(centerZ, targets[lastIndex] - lastShift);
  }

  if (normalizedCount >= 6) {
    const middleShiftTune = Number(MOREA_ALIGN_TUNE.BEAM_MIDDLE_BAND_TO_CENTER_SHIFT_M) || 0;
    const rawSpacingScale = Number(
      MOREA_ALIGN_TUNE.BEAM_MIDDLE_BAND_SPACING_SCALE ?? MOREA_ALIGN_TUNE.BEAM_MIDDLE_CLUSTER_SCALE
    );
    const middleSpacingScale = THREE.MathUtils.clamp(
      Number.isFinite(rawSpacingScale) ? rawSpacingScale : 1,
      0.5,
      1.5
    );
    if (middleShiftTune !== 0) {
      const middleStart = 1;
      const middleEnd = normalizedCount - 2;
      let middleSum = 0;
      let middleCount = 0;
      for (let index = middleStart; index <= middleEnd; index += 1) {
        middleSum += targets[index];
        middleCount += 1;
      }

      if (middleCount > 0) {
        const middleCenter = middleSum / middleCount;

        if (middleSpacingScale !== 1) {
          for (let index = middleStart; index <= middleEnd; index += 1) {
            const deltaFromMiddleCenter = targets[index] - middleCenter;
            targets[index] = middleCenter + deltaFromMiddleCenter * middleSpacingScale;
          }
        }

        if (middleShiftTune !== 0) {
          const shiftMagnitude = Math.abs(middleShiftTune);
          for (let index = middleStart; index <= middleEnd; index += 1) {
            const directionToCenter = Math.sign(centerZ - targets[index]);
            const direction = middleShiftTune > 0 ? directionToCenter : -directionToCenter;
            targets[index] += direction * shiftMagnitude;
          }
        }
      }
    }
  }

  return targets;
}

function resolveBeamTargetsFromSeatBounds(seatBoundEntries) {
  if (!Array.isArray(seatBoundEntries) || !seatBoundEntries.length) return null;

  const seatMinZ = Math.min(...seatBoundEntries.map((entry) => Number(entry.bounds?.min?.z)));
  const seatMaxZ = Math.max(...seatBoundEntries.map((entry) => Number(entry.bounds?.max?.z)));
  if (!Number.isFinite(seatMinZ) || !Number.isFinite(seatMaxZ) || seatMaxZ <= seatMinZ) return null;

  const pairGap = Math.max(0, Number(MOREA_ALIGN_TUNE.BEAM_SUPPORT_PAIR_GAP_M) || 0);
  const frontInset = Math.max(0, Number(MOREA_ALIGN_TUNE.BEAM_FRONT_SUPPORT_INSET_M) || 0);
  const backInset = Math.max(0, Number(MOREA_ALIGN_TUNE.BEAM_BACK_SUPPORT_INSET_M) || 0);

  const frontOuter = seatMinZ + frontInset;
  const frontInner = frontOuter + pairGap;
  const backOuter = seatMaxZ - backInset;
  const backInner = backOuter - pairGap;

  return {
    'beam-front-outer': frontOuter,
    'beam-front-inner': frontInner,
    'beam-back-inner': backInner,
    'beam-back-outer': backOuter,
  };
}

function clusterSortedValues(values, tolerance = 0.012) {
  const sorted = (values || [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (!sorted.length) return [];

  const groups = [[sorted[0]]];
  for (let index = 1; index < sorted.length; index += 1) {
    const value = sorted[index];
    const prevGroup = groups[groups.length - 1];
    const prevValue = prevGroup[prevGroup.length - 1];
    if (Math.abs(value - prevValue) <= tolerance) {
      prevGroup.push(value);
    } else {
      groups.push([value]);
    }
  }

  return groups.map((group) => group.reduce((sum, value) => sum + value, 0) / group.length);
}

function extractSupportZCenters(sideObj, side = 'left') {
  if (!sideObj) return [];

  sideObj.updateMatrixWorld?.(true);
  const bounds = getBounds(sideObj);
  if (!bounds) return [];

  const size = new THREE.Vector3();
  bounds.getSize(size);

  const sideWidth = Math.max(0.001, size.x);
  const sideDepth = Math.max(0.001, size.z);
  const sideHeight = Math.max(0.001, size.y);
  const innerEdgeX = side === 'left' ? bounds.max.x : bounds.min.x;

  const candidates = [];

  sideObj.traverse((node) => {
    if (!node?.isMesh) return;

    const meshBounds = new THREE.Box3().setFromObject(node);
    const meshSize = new THREE.Vector3();
    meshBounds.getSize(meshSize);
    const meshCenter = meshBounds.getCenter(new THREE.Vector3());

    if (!Number.isFinite(meshCenter.z)) return;

    const nearInnerEdge =
      side === 'left'
        ? Math.abs(innerEdgeX - meshBounds.max.x) <= sideWidth * 0.38
        : Math.abs(meshBounds.min.x - innerEdgeX) <= sideWidth * 0.38;

    const compactDepth = meshSize.z <= sideDepth * 0.34;
    const compactWidth = meshSize.x <= sideWidth * 0.85;
    const upperHalf = meshCenter.y >= bounds.min.y + sideHeight * 0.3;

    if (nearInnerEdge && compactDepth && compactWidth && upperHalf) {
      candidates.push(meshCenter.z);
    }
  });

  return clusterSortedValues(candidates, 0.01);
}

function pickFourBeamTargetZs(zValues, frontZ, backZ) {
  const sorted = (zValues || []).slice().sort((a, b) => a - b);
  if (sorted.length < 4) return null;

  const minZ = Number.isFinite(frontZ) ? frontZ : sorted[0];
  const maxZ = Number.isFinite(backZ) ? backZ : sorted[sorted.length - 1];
  const range = Math.max(0.001, maxZ - minZ);

  const targetSlots = [
    minZ + range * 0.05,
    minZ + range * 0.35,
    minZ + range * 0.65,
    minZ + range * 0.95,
  ];

  const picked = [];
  const used = new Set();
  targetSlots.forEach((slot) => {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    sorted.forEach((value, index) => {
      if (used.has(index)) return;
      const distance = Math.abs(value - slot);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0) {
      used.add(bestIndex);
      picked.push(sorted[bestIndex]);
    }
  });

  if (picked.length < 4) return null;
  return picked.sort((a, b) => a - b);
}

function resolveBeamTargetsFromSupportGeometry({ leftSideObj, rightSideObj, frontZ, backZ }) {

  const leftSupportZs = extractSupportZCenters(leftSideObj, 'left');
  const rightSupportZs = extractSupportZCenters(rightSideObj, 'right');
  const allZ = clusterSortedValues([...leftSupportZs, ...rightSupportZs], 0.014);

  const selected = pickFourBeamTargetZs(allZ, frontZ, backZ);
  if (!selected) return null;

  return {
    'beam-front-outer': selected[0],
    'beam-front-inner': selected[1],
    'beam-back-inner': selected[2],
    'beam-back-outer': selected[3],
  };
}

function resolveBeamRoleFallbackTargets(frontZ, backZ) {
  if (!Number.isFinite(frontZ) || !Number.isFinite(backZ)) return null;

  const span = Math.max(0, backZ - frontZ);
  const pairGap = Math.min(
    Math.max(0, Number(MOREA_ALIGN_TUNE.BEAM_SUPPORT_PAIR_GAP_M) || 0),
    span * 0.25
  );

  return {
    'beam-front-outer': frontZ,
    'beam-front-inner': frontZ + pairGap,
    'beam-back-inner': backZ - pairGap,
    'beam-back-outer': backZ,
  };
}

function resolveBeamVisibleOffsetInMeters(rawOffsetValue, stepOverride = null) {
  const explicitStep = Number(stepOverride);
  const defaultStep = Number(MOREA_ALIGN_TUNE.BEAM_VISIBLE_Z_OFFSET_STEP_M);
  const stepMeters =
    Number.isFinite(explicitStep) && explicitStep > 0
      ? explicitStep
      : Number.isFinite(defaultStep) && defaultStep > 0
        ? defaultStep
        : 0.01;
  return (Number(rawOffsetValue) || 0) * stepMeters;
}

function resolveCenterSupportTargetXsFromSeats(seatBoundEntries, quantity) {
  if (!Array.isArray(seatBoundEntries) || !seatBoundEntries.length) return [];

  const normalizedQuantity = Math.max(1, Math.trunc(Number(quantity) || seatBoundEntries.length));

  const seatCentersX = seatBoundEntries
    .map((entry) => getCenter(entry.bounds)?.x)
    .filter((x) => Number.isFinite(x));

  if (!seatCentersX.length) return [];

  const effectiveQuantity = Math.max(1, Math.min(normalizedQuantity, seatCentersX.length));
  if (effectiveQuantity < 3) return [];

  if (effectiveQuantity === 3) {
    return [seatCentersX[Math.min(1, seatCentersX.length - 1)]].filter((x) => Number.isFinite(x));
  }

  if (effectiveQuantity === 4) {
    const left = seatCentersX[Math.min(1, seatCentersX.length - 1)];
    const right = seatCentersX[Math.min(2, seatCentersX.length - 1)];
    return Number.isFinite(left) && Number.isFinite(right) ? [(left + right) / 2] : [];
  }

  if (effectiveQuantity === 5) {
    return [
      seatCentersX[Math.min(1, seatCentersX.length - 1)],
      seatCentersX[Math.min(3, seatCentersX.length - 1)],
    ].filter((x) => Number.isFinite(x));
  }

  if (effectiveQuantity === 6) {
    const leftA = seatCentersX[Math.min(1, seatCentersX.length - 1)];
    const rightA = seatCentersX[Math.min(2, seatCentersX.length - 1)];
    const leftB = seatCentersX[Math.min(3, seatCentersX.length - 1)];
    const rightB = seatCentersX[Math.min(4, seatCentersX.length - 1)];
    const targets = [];
    if (Number.isFinite(leftA) && Number.isFinite(rightA)) targets.push((leftA + rightA) / 2);
    if (Number.isFinite(leftB) && Number.isFinite(rightB)) targets.push((leftB + rightB) / 2);
    return targets;
  }

  if (effectiveQuantity === 7) {
    return [
      seatCentersX[Math.min(1, seatCentersX.length - 1)],
      seatCentersX[Math.min(3, seatCentersX.length - 1)],
      seatCentersX[Math.min(5, seatCentersX.length - 1)],
    ].filter((x) => Number.isFinite(x));
  }

  if (effectiveQuantity === 8) {
    const a1 = seatCentersX[Math.min(1, seatCentersX.length - 1)];
    const a2 = seatCentersX[Math.min(2, seatCentersX.length - 1)];
    const b1 = seatCentersX[Math.min(3, seatCentersX.length - 1)];
    const b2 = seatCentersX[Math.min(4, seatCentersX.length - 1)];
    const c1 = seatCentersX[Math.min(5, seatCentersX.length - 1)];
    const c2 = seatCentersX[Math.min(6, seatCentersX.length - 1)];
    const targets = [];
    if (Number.isFinite(a1) && Number.isFinite(a2)) targets.push((a1 + a2) / 2);
    if (Number.isFinite(b1) && Number.isFinite(b2)) targets.push((b1 + b2) / 2);
    if (Number.isFinite(c1) && Number.isFinite(c2)) targets.push((c1 + c2) / 2);
    return targets;
  }

  if (effectiveQuantity % 2 === 1) {
    const middleIndex = Math.floor(effectiveQuantity / 2);
    return [seatCentersX[Math.min(middleIndex, seatCentersX.length - 1)]].filter((x) =>
      Number.isFinite(x)
    );
  }

  const leftMiddleIndex = Math.max(0, effectiveQuantity / 2 - 1);
  const rightMiddleIndex = Math.min(seatCentersX.length - 1, effectiveQuantity / 2);
  const leftX = seatCentersX[leftMiddleIndex];
  const rightX = seatCentersX[rightMiddleIndex];
  if (!Number.isFinite(leftX) || !Number.isFinite(rightX)) return [];
  return [(leftX + rightX) / 2];
}

function alignMoreaModule(moduleParts) {
  const seats = Array.isArray(moduleParts?.seats) ? moduleParts.seats.filter(Boolean) : [];
  const leftSideObj = moduleParts?.leftSide || null;
  const rightSideObj = moduleParts?.rightSide || null;
  const centerSideObjects = Array.isArray(moduleParts?.centerSides)
    ? moduleParts.centerSides.filter(Boolean)
    : [];
  const beamEntries = Array.isArray(moduleParts?.beams) ? moduleParts.beams.filter(Boolean) : [];

  if (!seats.length || !leftSideObj || !rightSideObj) return;

  seats.forEach((seat) => seat.updateMatrixWorld?.(true));
  leftSideObj.updateMatrixWorld?.(true);
  rightSideObj.updateMatrixWorld?.(true);

  const seatBoundEntries = seats
    .map((seat) => ({ seat, bounds: getBounds(seat) }))
    .filter((entry) => !!entry.bounds)
    .sort((a, b) => {
      const ca = getCenter(a.bounds);
      const cb = getCenter(b.bounds);
      return (ca?.x || 0) - (cb?.x || 0);
    });

  if (!seatBoundEntries.length) return;

  const moreaVariant = String(
    moduleParts?.variant || seats[0]?.userData?.meta?.moreaVariant || 'single'
  )
    .trim()
    .toLowerCase();
  const isDouble = moreaVariant === 'double';

  const leftSeatBounds = seatBoundEntries[0].bounds;
  const quantity = Math.max(1, Number(moduleParts?.quantity) || seatBoundEntries.length);
  const anchorSeatIndex = Math.max(0, quantity - 1);
  const rightSeatBounds =
    seatBoundEntries[Math.min(anchorSeatIndex, seatBoundEntries.length - 1)].bounds;

  const leftBounds = getBounds(leftSideObj);
  const rightBounds = getBounds(rightSideObj);
  if (!leftSeatBounds || !rightSeatBounds || !leftBounds || !rightBounds) return;

  const leftCenter = getCenter(leftBounds);
  const rightCenter = getCenter(rightBounds);
  const leftSeatCenter = getCenter(leftSeatBounds);
  const rightSeatCenter = getCenter(rightSeatBounds);
  if (!leftCenter || !rightCenter || !leftSeatCenter || !rightSeatCenter) return;

  const leftWidth = leftBounds.max.x - leftBounds.min.x;
  const rightWidth = rightBounds.max.x - rightBounds.min.x;

  const leftPedestalCode = leftSideObj?.userData?.codigoPT || leftSideObj?.userData?.code;
  const rightPedestalCode = rightSideObj?.userData?.codigoPT || rightSideObj?.userData?.code;
  const resolvedPedestalMode = resolveMoreaPedestalModeByCode(
    leftPedestalCode || rightPedestalCode,
    isDouble ? 'double' : 'single'
  );
  const configuredWoodOutwardOffsetMm = isDouble
    ? Number(
      MOREA_DOUBLE_BUILDER_TUNE.WOOD_PEDESTAL_OUTWARD_OFFSET_MM ??
          MOREA_BUILDER_TUNE.WOOD_PEDESTAL_OUTWARD_OFFSET_MM ??
          12
    )
    : Number(MOREA_BUILDER_TUNE.WOOD_PEDESTAL_OUTWARD_OFFSET_MM ?? 12);
  const woodOutwardOffsetM =
    resolvedPedestalMode === 'wood'
      ? Math.max(0, configuredWoodOutwardOffsetMm || 0) / 1000
      : 0;

  const targetLeftCenterX =
    leftSeatBounds.min.x + leftWidth * MOREA_ALIGN_TUNE.SIDE_INSET_FACTOR - woodOutwardOffsetM;
  const targetRightCenterX =
    rightSeatBounds.max.x - rightWidth * MOREA_ALIGN_TUNE.SIDE_INSET_FACTOR + woodOutwardOffsetM;

  shiftObject(leftSideObj, targetLeftCenterX - leftCenter.x, 0, 0);
  shiftObject(rightSideObj, targetRightCenterX - rightCenter.x, 0, 0);

  const leftAfter = getBounds(leftSideObj);
  const rightAfter = getBounds(rightSideObj);
  if (!leftAfter || !rightAfter) return;

  const leftAfterCenter = getCenter(leftAfter);
  const rightAfterCenter = getCenter(rightAfter);
  if (!leftAfterCenter || !rightAfterCenter) return;

  const targetZ = (leftSeatCenter.z + rightSeatCenter.z) / 2;
  shiftObject(leftSideObj, 0, 0, targetZ - leftAfterCenter.z);
  shiftObject(rightSideObj, 0, 0, targetZ - rightAfterCenter.z);
  shiftObject(leftSideObj, 0, -MOREA_ALIGN_TUNE.SIDE_DROP_M, 0);
  shiftObject(rightSideObj, 0, -MOREA_ALIGN_TUNE.SIDE_DROP_M, 0);

  const leftFinal = getBounds(leftSideObj);
  const rightFinal = getBounds(rightSideObj);
  if (!leftFinal || !rightFinal) return;

  if (centerSideObjects.length) {
    const leftFinalCenter = getCenter(leftFinal);
    const rightFinalCenter = getCenter(rightFinal);
    const centerSupportTargets = (isDouble
      ? resolveMoreaDoubleCenterSupportOffsetsMm(quantity, Number(moduleParts?.moduleSpacingMm) || 610)
        .map((offsetMm) => Number(offsetMm) / 1000)
      : resolveCenterSupportTargetXsFromSeats(seatBoundEntries, quantity)
    )
      .filter((x) => Number.isFinite(x))
      .sort((a, b) => a - b);

    if (leftFinalCenter && rightFinalCenter && centerSupportTargets.length) {
      const targetSupportY = (leftFinalCenter.y + rightFinalCenter.y) / 2;

      const orderedSupports = centerSideObjects
        .map((centerObj) => {
          centerObj.updateMatrixWorld?.(true);
          const centerBounds = getBounds(centerObj);
          const center = getCenter(centerBounds);
          return { centerObj, center };
        })
        .filter((entry) => !!entry.center)
        .sort((a, b) => a.center.x - b.center.x);

      orderedSupports.forEach((entry, index) => {
        const targetSupportX = centerSupportTargets[
          Math.min(index, centerSupportTargets.length - 1)
        ];
        shiftObject(
          entry.centerObj,
          targetSupportX - entry.center.x,
          targetSupportY - entry.center.y,
          targetZ - entry.center.z
        );
      });
    }
  }

  const seatRaiseM = Number(MOREA_ALIGN_TUNE.SEAT_RAISE_M) || 0;
  if (seatRaiseM > 0) {
    seatBoundEntries.forEach(({ seat }) => shiftObject(seat, 0, seatRaiseM, 0));
  }

  const innerLeftX = leftFinal.max.x;
  const innerRightX = rightFinal.min.x;
  const spanX = Math.max(0.05, innerRightX - innerLeftX);

  const frontZBase =
    Math.min(leftFinal.min.z, rightFinal.min.z) + MOREA_ALIGN_TUNE.BEAM_INSET_FROM_SIDE_Z_M;
  const backZBase =
    Math.max(leftFinal.max.z, rightFinal.max.z) - MOREA_ALIGN_TUNE.BEAM_INSET_FROM_SIDE_Z_M;
  const maxCloser = Math.max(0, (backZBase - frontZBase) * 0.45);
  const pairCloser = Math.min(MOREA_ALIGN_TUNE.BEAM_PAIR_CLOSER_M, maxCloser);
  const frontZ = frontZBase + pairCloser;
  const backZ = backZBase - pairCloser;
  const beamTopOffset = Number(MOREA_ALIGN_TUNE.BEAM_TOP_Y_OFFSET_M) || 0;
  const beamVerticalDrop = Math.max(0, Number(MOREA_ALIGN_TUNE.BEAM_VERTICAL_DROP_M) || 0);
  const beamY = Math.max(leftFinal.max.y, rightFinal.max.y) - beamTopOffset - beamVerticalDrop;
  const beamTargetX = (innerLeftX + innerRightX) / 2;
  const fallbackBeamTargets = resolveBeamTargetPositions(frontZ, backZ, beamEntries.length || 2);
  const fallbackRoleTargets = resolveBeamRoleFallbackTargets(frontZ, backZ);
  const supportRoleTargets = resolveBeamTargetsFromSupportGeometry({
    leftSideObj,
    rightSideObj,
    frontZ,
    backZ,
  });
  const seatRoleTargets = resolveBeamTargetsFromSeatBounds(seatBoundEntries);
  const isDoubleMorea = String(moduleParts?.variant || 'single').toLowerCase() === 'double';
  const beamOffsetByVisibleIndex =
    (isDoubleMorea
      ? MOREA_ALIGN_TUNE.BEAM_Z_OFFSET_BY_VISIBLE_INDEX_DOUBLE
      : MOREA_ALIGN_TUNE.BEAM_Z_OFFSET_BY_VISIBLE_INDEX_SINGLE) ||
    MOREA_ALIGN_TUNE.BEAM_Z_OFFSET_BY_VISIBLE_INDEX ||
    {};
  const beamXOffsetByVisibleIndexMm =
    (isDoubleMorea
      ? MOREA_ALIGN_TUNE.BEAM_X_OFFSET_BY_VISIBLE_INDEX_MM_DOUBLE
      : MOREA_ALIGN_TUNE.BEAM_X_OFFSET_BY_VISIBLE_INDEX_MM_SINGLE) ||
    MOREA_ALIGN_TUNE.BEAM_X_OFFSET_BY_VISIBLE_INDEX_MM ||
    {};
  const beamVisibleStepM =
    (isDoubleMorea
      ? Number(MOREA_ALIGN_TUNE.BEAM_VISIBLE_Z_OFFSET_STEP_M_DOUBLE)
      : Number(MOREA_ALIGN_TUNE.BEAM_VISIBLE_Z_OFFSET_STEP_M_SINGLE));
  const useMiddleBandOnlyLayout = beamEntries.length >= 6;
  let denseTargetsByVisibleIndex = null;

  if (useMiddleBandOnlyLayout) {
    const denseFrontOuterTarget =
      supportRoleTargets?.['beam-front-outer'] ??
      seatRoleTargets?.['beam-front-outer'] ??
      fallbackRoleTargets?.['beam-front-outer'];
    const denseBackOuterTarget =
      supportRoleTargets?.['beam-back-outer'] ??
      seatRoleTargets?.['beam-back-outer'] ??
      fallbackRoleTargets?.['beam-back-outer'];

    if (Number.isFinite(denseFrontOuterTarget) && Number.isFinite(denseBackOuterTarget)) {
      denseTargetsByVisibleIndex = resolveBeamTargetPositions(
        denseFrontOuterTarget,
        denseBackOuterTarget,
        beamEntries.length
      );
    }
  }

  const placeBeam = (beamObj, targetZPos, side, targetX = beamTargetX) => {
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

    shiftObject(beamObj, targetX - scaledCenter.x, targetEdgeY, targetEdgeZ);
  };

  const beamPlacements = beamEntries
    .map((beamEntry, index) => {
      const role = String(beamEntry?.role || '').toLowerCase();
      const roleTarget = supportRoleTargets?.[role] ?? seatRoleTargets?.[role] ?? fallbackRoleTargets?.[role];
      const targetZPosBase =
        Number.isFinite(roleTarget)
          ? roleTarget
          : fallbackBeamTargets[Math.min(index, fallbackBeamTargets.length - 1)];

      return {
        beamEntry,
        role,
        targetZPosBase,
      };
    })
    .sort((a, b) => a.targetZPosBase - b.targetZPosBase);

  beamPlacements.forEach(({ beamEntry, role, targetZPosBase }, visibleIndex) => {
    const beamObj = beamEntry?.obj || beamEntry;
    const denseTargetZPosBase = Number(denseTargetsByVisibleIndex?.[visibleIndex]);
    const resolvedTargetZPosBase = Number.isFinite(denseTargetZPosBase)
      ? denseTargetZPosBase
      : targetZPosBase;
    const beamOffset = resolveBeamVisibleOffsetInMeters(
      beamOffsetByVisibleIndex?.[visibleIndex + 1],
      beamVisibleStepM
    );
    const beamXOffsetMm = Number(beamXOffsetByVisibleIndexMm?.[visibleIndex + 1] || 0);
    const targetZPos = resolvedTargetZPosBase + beamOffset;
    const side = role.includes('front') ? 'front' : role.includes('back') ? 'back' : 'middle';
    const targetX = beamTargetX + beamXOffsetMm / 1000;
    placeBeam(beamObj, targetZPos, side, targetX);
  });
}

export async function createMoreaInstance({
  api,
  config,
  parent = null,
  notify = defaultNotify,
  buildHidden = false,
  deferReveal = false,
} = {}) {
  if (!api) throw new TypeError('createMoreaInstance requires the ThreeCanvas API.');
  if (!config || typeof config !== 'object') {
    throw new TypeError('createMoreaInstance requires a configuration object.');
  }

  const built = buildMorea(config);
  const { groupId, groupName, parts = [], variant = 'single' } = built || {};

  const assembly =
    api.createMilaAssemblyGroup?.({
      ...config,
      groupId,
      groupName,
      kind: 'MOREA_ASSEMBLY',
      type: 'morea',
      line: 'MOREA',
      variant,
    }) || null;

  if (!assembly) {
    notify('No se pudo crear el grupo de Morea.');
    return null;
  }

  if (buildHidden) {
    assembly.visible = false;
  }

  if (parent && assembly.parent !== parent) parent.add?.(assembly);

  const moduleParts = {
    variant,
    quantity: built.quantity,
    moduleSpacingMm: built.moduleSpacingMm,
    seats: [],
    leftSide: null,
    rightSide: null,
    centerSides: [],
    beams: [],
  };

  for (const part of parts) {
    if (!part?.code || !part?.model?.src) {
      notify(`No tenemos disponible esta parte de Morea: ${part?.logicalCode || 'sin código'}`);
      continue;
    }

    const createdObj = await api.addExternalGlbPart?.({
      ...part,
      groupId: part.groupId || groupId,
      groupName: part.groupName || groupName,
      parentGroup: assembly,
    });

    if (!createdObj) continue;

    const role = String(part?.meta?.role || '').toLowerCase();
    if (role === 'seat') moduleParts.seats.push(createdObj);
    if (role === 'side-left') moduleParts.leftSide = createdObj;
    if (role === 'side-right') moduleParts.rightSide = createdObj;
    if (role.startsWith('side-center-support')) moduleParts.centerSides.push(createdObj);
    if (role.startsWith('beam')) moduleParts.beams.push({ obj: createdObj, role });
  }

  const leftPedestalCode = moduleParts.leftSide?.userData?.codigoPT || moduleParts.leftSide?.userData?.code;
  const rightPedestalCode = moduleParts.rightSide?.userData?.codigoPT || moduleParts.rightSide?.userData?.code;
  const resolvedPedestalMode = resolveMoreaPedestalModeByCode(
    leftPedestalCode || rightPedestalCode,
    variant
  );
  assembly.userData = {
    ...(assembly.userData || {}),
    meta: {
      ...(assembly.userData?.meta || {}),
      moreaVariant: variant,
      pedestalMode: resolvedPedestalMode,
    },
  };

  alignMoreaModule(moduleParts);
  snapAssemblyToGridTop(assembly);
  assembly.updateMatrixWorld?.(true);

  if (buildHidden && !deferReveal) {
    assembly.visible = true;
  }

  if (!deferReveal) {
    api.selectObject?.(assembly);
  }

  return {
    assembly,
    groupId,
    groupName,
    parts,
    quantity: built.quantity,
    variant,
  };
}
