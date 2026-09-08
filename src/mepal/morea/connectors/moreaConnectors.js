// src/mepal/morea/connectors/moreaConnectors.js
import * as THREE from 'three';
import { MILA_GIRO_CONNECTOR_TUNE, MILA_GIRO_TUNE } from '../../mila/config/milaGiroTunables.js';
import { MILA_ACCESSORY_OFFSETS_MM } from '../../mila/config/milaTunables.js';

export const MILA_CONNECTOR_CONFIG = {
  SNAP_RADIUS_M: 0.48, // Radio de detección para acople óptimo (48 cm)
  CONNECTOR_RADIUS_M: 0.048, // Radio del cilindro conector
  CONNECTOR_THICKNESS_M: 0.035, // Grosor lateral
  COLOR_NORMAL: 0xf59e0b, // Amarillo / ámbar sólido tipo accesorio CAD
  COLOR_SNAP_ACTIVE: 0x10b981, // Verde esmeralda cuando está en rango de acople
  CORE_COLOR_NORMAL: 0xd97706, // Color contraste del núcleo interior
  CORE_COLOR_ACTIVE: 0x059669,
};

const PANEL_DIVISOR_CONNECTOR_TUNE = {
  // Acercamiento a pared en X. Más negativo = más pegado a la pared.
  panelBackFaceXM: -0.02,
  // Separación real de la cara visible del conector respecto a la pared.
  // 0.02 = 2 cm.
  wallInsetM: 0.02,
  // Solape real de la silla contra la pared para tapar el hueco visual.
  // 0.02 = 2 cm.
  panelWallOverlapM: 0.08,
  moduleSpacingM: 0.6,
  // Posición base en Z por lado. Más alto en valor absoluto = silla más atrás.
  sideCenterZM: 0.75,
  // Empuje adicional hacia atrás para todos los puestos (1-4).
  seatBackShiftM: 0.06,
  // Empuje extra solamente cuando son 2-4 puestos.
  multiSeatBackExtraShiftM: 0,
};

function clampPanelSeats(value) {
  return Math.max(0, Math.min(4, Number(value) || 0));
}

function clampMilaQuantity(value) {
  return Math.max(1, Math.min(4, Number(value) || 1));
}

function isMoreaObject(object) {
  if (!object?.userData) return false;
  const line = String(object.userData?.line || object.userData?.meta?.line || '').toUpperCase();
  const type = String(object.userData?.type || '').toLowerCase();
  const kind = String(object.userData?.kind || '').toUpperCase();
  const category = String(object.userData?.category || object.userData?.meta?.category || '').toLowerCase();
  return (
    line === 'MOREA' ||
    type === 'morea' ||
    type === 'morea_giro_surface' ||
    kind === 'MOREA_ASSEMBLY' ||
    kind === 'MOREA_GIRO_SURFACE' ||
    category === 'morea'
  );
}

function resolveObjectLocalBounds(root) {
  if (!root) return null;
  root.updateMatrixWorld?.(true);

  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const localBounds = new THREE.Box3();
  let hasBounds = false;

  root.traverse((node) => {
    if (!node?.isMesh || !node.geometry) return;
    const geometry = node.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;

    const toRootLocal = new THREE.Matrix4().multiplyMatrices(invRoot, node.matrixWorld);
    const nodeLocalBox = geometry.boundingBox.clone().applyMatrix4(toRootLocal);

    if (!Number.isFinite(nodeLocalBox.min.x) || !Number.isFinite(nodeLocalBox.max.x)) return;
    if (!hasBounds) {
      localBounds.copy(nodeLocalBox);
      hasBounds = true;
      return;
    }
    localBounds.union(nodeLocalBox);
  });

  return hasBounds ? localBounds : null;
}

function resolveNodeRole(node) {
  return String(node?.userData?.meta?.role || node?.userData?.role || '').toLowerCase();
}

function nodeBelongsToRole(node, root, role) {
  const targetRole = String(role || '').toLowerCase();
  if (!node || !root || !targetRole) return false;

  let curr = node;
  while (curr) {
    if (resolveNodeRole(curr) === targetRole) return true;
    if (curr === root) break;
    curr = curr.parent;
  }

  return false;
}

function resolveMoreaSidePortsCore(targetObj, worldQuaternion, options = {}) {
  const localBox = resolveObjectLocalBounds(targetObj);
  if (!localBox) return null;

  const spanX = Math.max(0.001, localBox.max.x - localBox.min.x);
  const spanY = Math.max(0.001, localBox.max.y - localBox.min.y);
  const spanZ = Math.max(0.001, localBox.max.z - localBox.min.z);
  const sideBandTol = Math.max(0.01, spanX * 0.08);
  const sideInset = THREE.MathUtils.clamp(spanX * 0.01, 0.004, 0.02);
  const desiredWorldY = Number.isFinite(options.desiredWorldY)
    ? Number(options.desiredWorldY)
    : null;
  const supportBottomBandY = localBox.min.y + spanY * 0.25;
  const supportTopLimitY = localBox.min.y + spanY * 0.82;
  const centerX = (localBox.min.x + localBox.max.x) * 0.5;
  const centerZ = (localBox.min.z + localBox.max.z) * 0.5;

  const invRoot = new THREE.Matrix4().copy(targetObj.matrixWorld).invert();

  const leftBand = {
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    found: false,
  };
  const rightBand = {
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    found: false,
  };
  const leftSupport = {
    found: false,
    score: Number.NEGATIVE_INFINITY,
    center: null,
  };
  const rightSupport = {
    found: false,
    score: Number.NEGATIVE_INFINITY,
    center: null,
  };
  const leftSupportCandidates = [];
  const rightSupportCandidates = [];
  const supportCandidates = [];
  const lowerBandCandidates = [];
  let topSurfaceZRange = null;
  let topSurfaceScore = Number.NEGATIVE_INFINITY;

  targetObj.traverse((node) => {
    if (!node?.isMesh || !node.geometry) return;
    if (typeof options.meshFilter === 'function' && !options.meshFilter(node)) return;
    const geometry = node.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;

    const toRootLocal = new THREE.Matrix4().multiplyMatrices(invRoot, node.matrixWorld);
    const nodeLocalBox = geometry.boundingBox.clone().applyMatrix4(toRootLocal);

    if (!Number.isFinite(nodeLocalBox.min.x) || !Number.isFinite(nodeLocalBox.max.x)) return;

    const touchesLeftBand = nodeLocalBox.min.x <= localBox.min.x + sideBandTol;
    const touchesRightBand = nodeLocalBox.max.x >= localBox.max.x - sideBandTol;
    const nodeCenterX = (nodeLocalBox.min.x + nodeLocalBox.max.x) * 0.5;
    const sideAffinityLeft = nodeCenterX <= centerX;
    const sideAffinityRight = nodeCenterX >= centerX;

    const sxNode = Math.max(0.001, nodeLocalBox.max.x - nodeLocalBox.min.x);
    const syNode = Math.max(0.001, nodeLocalBox.max.y - nodeLocalBox.min.y);
    const szNode = Math.max(0.001, nodeLocalBox.max.z - nodeLocalBox.min.z);
    const inSupportBand =
      nodeLocalBox.min.y <= supportBottomBandY &&
      nodeLocalBox.max.y <= supportTopLimitY;
    if (nodeLocalBox.max.y >= localBox.min.y + spanY * 0.72) {
      const topScore = sxNode * szNode;
      if (topScore > topSurfaceScore) {
        topSurfaceScore = topScore;
        topSurfaceZRange = {
          minZ: nodeLocalBox.min.z,
          maxZ: nodeLocalBox.max.z,
        };
      }
    }

    if (inSupportBand) {
      lowerBandCandidates.push({
        center: new THREE.Vector3(
          (nodeLocalBox.min.x + nodeLocalBox.max.x) * 0.5,
          (nodeLocalBox.min.y + nodeLocalBox.max.y) * 0.5,
          (nodeLocalBox.min.z + nodeLocalBox.max.z) * 0.5
        ),
        score: sxNode * syNode * szNode,
        sx: sxNode,
        sy: syNode,
        sz: szNode,
        edgeDistance: Math.min(
          Math.abs(((nodeLocalBox.min.x + nodeLocalBox.max.x) * 0.5) - localBox.min.x),
          Math.abs(((nodeLocalBox.min.x + nodeLocalBox.max.x) * 0.5) - localBox.max.x)
        ),
        supportLike: syNode >= spanY * 0.22,
      });
    }

    if (touchesLeftBand) {
      leftBand.minZ = Math.min(leftBand.minZ, nodeLocalBox.min.z);
      leftBand.maxZ = Math.max(leftBand.maxZ, nodeLocalBox.max.z);
      leftBand.minY = Math.min(leftBand.minY, nodeLocalBox.min.y);
      leftBand.maxY = Math.max(leftBand.maxY, nodeLocalBox.max.y);
      leftBand.found = true;

      if (sideAffinityLeft && inSupportBand) {
        const sx = sxNode;
        const sy = syNode;
        const sz = szNode;
        const score = sx * sy * sz;
        const center = new THREE.Vector3(
          (nodeLocalBox.min.x + nodeLocalBox.max.x) * 0.5,
          (nodeLocalBox.min.y + nodeLocalBox.max.y) * 0.5,
          (nodeLocalBox.min.z + nodeLocalBox.max.z) * 0.5
        );
        const candidate = {
          center,
          score,
          sx,
          sy,
          sz,
          edgeDistance: Math.abs(center.x - localBox.min.x),
          supportLike: sy >= spanY * 0.22 && sx <= spanX * 0.28 && sz <= spanZ * 0.45,
        };
        supportCandidates.push(candidate);
        leftSupportCandidates.push(candidate);
        if (score > leftSupport.score) {
          leftSupport.score = score;
          leftSupport.found = true;
          leftSupport.center = center.clone();
        }
      }
    }
    if (touchesRightBand) {
      rightBand.minZ = Math.min(rightBand.minZ, nodeLocalBox.min.z);
      rightBand.maxZ = Math.max(rightBand.maxZ, nodeLocalBox.max.z);
      rightBand.minY = Math.min(rightBand.minY, nodeLocalBox.min.y);
      rightBand.maxY = Math.max(rightBand.maxY, nodeLocalBox.max.y);
      rightBand.found = true;

      if (sideAffinityRight && inSupportBand) {
        const sx = sxNode;
        const sy = syNode;
        const sz = szNode;
        const score = sx * sy * sz;
        const center = new THREE.Vector3(
          (nodeLocalBox.min.x + nodeLocalBox.max.x) * 0.5,
          (nodeLocalBox.min.y + nodeLocalBox.max.y) * 0.5,
          (nodeLocalBox.min.z + nodeLocalBox.max.z) * 0.5
        );
        const candidate = {
          center,
          score,
          sx,
          sy,
          sz,
          edgeDistance: Math.abs(center.x - localBox.max.x),
          supportLike: sy >= spanY * 0.22 && sx <= spanX * 0.28 && sz <= spanZ * 0.45,
        };
        supportCandidates.push(candidate);
        rightSupportCandidates.push(candidate);
        if (score > rightSupport.score) {
          rightSupport.score = score;
          rightSupport.found = true;
          rightSupport.center = center.clone();
        }
      }
    }
  });

  const fallbackCenterZ = (localBox.min.z + localBox.max.z) * 0.5;
  const fallbackCenterY = (localBox.min.y + localBox.max.y) * 0.5;
  const leftCenterZ = leftBand.found ? (leftBand.minZ + leftBand.maxZ) * 0.5 : fallbackCenterZ;
  const rightCenterZ = rightBand.found ? (rightBand.minZ + rightBand.maxZ) * 0.5 : fallbackCenterZ;
  const leftCenterY = leftBand.found ? (leftBand.minY + leftBand.maxY) * 0.5 : fallbackCenterY;
  const rightCenterY = rightBand.found ? (rightBand.minY + rightBand.maxY) * 0.5 : fallbackCenterY;

  const leftBandAnchor = new THREE.Vector3(localBox.min.x + sideInset, leftCenterY, leftCenterZ);
  const rightBandAnchor = new THREE.Vector3(localBox.max.x - sideInset, rightCenterY, rightCenterZ);

  let leftAnchorLocal = leftSupport.found && leftSupport.center
    ? leftSupport.center.clone()
    : leftBandAnchor.clone();
  let rightAnchorLocal = rightSupport.found && rightSupport.center
    ? rightSupport.center.clone()
    : rightBandAnchor.clone();

  const uniqueCandidates = [];
  const mergeThreshold2 = 0.0004;
  for (const candidate of supportCandidates) {
    const duplicated = uniqueCandidates.some((item) => item.center.distanceToSquared(candidate.center) < mergeThreshold2);
    if (!duplicated) uniqueCandidates.push(candidate);
  }

  const uniqueLowerBandCandidates = [];
  for (const candidate of lowerBandCandidates) {
    const duplicated = uniqueLowerBandCandidates.some(
      (item) => item.center.distanceToSquared(candidate.center) < mergeThreshold2
    );
    if (!duplicated) uniqueLowerBandCandidates.push(candidate);
  }

  const resolveAnchorFromAxisExtremes = (candidates, majorAxis) => {
    if (!Array.isArray(candidates) || !candidates.length) return null;
    if (candidates.length === 1) return candidates[0].center.clone();

    const scored = candidates.map((candidate) => ({
      candidate,
      majorScore: candidate.center.x * majorAxis.x + candidate.center.z * majorAxis.y,
    }));
    scored.sort((a, b) => a.majorScore - b.majorScore);

    const first = scored[0]?.candidate?.center;
    const last = scored[scored.length - 1]?.candidate?.center;
    if (!first || !last) return null;

    return new THREE.Vector3(
      (first.x + last.x) * 0.5,
      (first.y + last.y) * 0.5,
      (first.z + last.z) * 0.5
    );
  };

  const resolveAnchorFromFarthestPair = (candidates) => {
    if (!Array.isArray(candidates) || !candidates.length) return null;
    if (candidates.length === 1) return candidates[0].center.clone();

    let bestPair = null;
    let bestDist2 = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const a = candidates[i].center;
        const b = candidates[j].center;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const dist2 = dx * dx + dz * dz;
        if (dist2 > bestDist2) {
          bestDist2 = dist2;
          bestPair = [a, b];
        }
      }
    }

    if (!bestPair) return candidates[0].center.clone();
    return new THREE.Vector3(
      (bestPair[0].x + bestPair[1].x) * 0.5,
      (bestPair[0].y + bestPair[1].y) * 0.5,
      (bestPair[0].z + bestPair[1].z) * 0.5
    );
  };

  const resolveLowerBandSideAnchors = () => {
    const supportLikeCandidates = uniqueLowerBandCandidates.filter((candidate) => candidate.supportLike);
    const effectiveCandidates =
      supportLikeCandidates.length >= 2 ? supportLikeCandidates : uniqueLowerBandCandidates;

    if (effectiveCandidates.length < 2) return null;

    // Separar las dos familias de soportes reales con semillas de par más lejano en XZ.
    let seedA = effectiveCandidates[0].center;
    let seedB = effectiveCandidates[effectiveCandidates.length - 1].center;
    let bestSeedDist2 = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < effectiveCandidates.length; i += 1) {
      for (let j = i + 1; j < effectiveCandidates.length; j += 1) {
        const a = effectiveCandidates[i].center;
        const b = effectiveCandidates[j].center;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const dist2 = dx * dx + dz * dz;
        if (dist2 > bestSeedDist2) {
          bestSeedDist2 = dist2;
          seedA = a;
          seedB = b;
        }
      }
    }

    const toGroup = (candidate, pA, pB) => {
      const dxA = candidate.center.x - pA.x;
      const dzA = candidate.center.z - pA.z;
      const dxB = candidate.center.x - pB.x;
      const dzB = candidate.center.z - pB.z;
      return (dxA * dxA + dzA * dzA) <= (dxB * dxB + dzB * dzB) ? 'A' : 'B';
    };

    let sideA = [];
    let sideB = [];
    effectiveCandidates.forEach((candidate) => {
      if (toGroup(candidate, seedA, seedB) === 'A') sideA.push(candidate);
      else sideB.push(candidate);
    });

    const centroidOf = (group) => {
      if (!group.length) return null;
      const sum = group.reduce(
        (acc, candidate) => {
          acc.x += candidate.center.x;
          acc.z += candidate.center.z;
          return acc;
        },
        { x: 0, z: 0 }
      );
      return new THREE.Vector3(sum.x / group.length, 0, sum.z / group.length);
    };

    // Un refinamiento de agrupación para estabilizar diagonales.
    if (sideA.length && sideB.length) {
      const cA = centroidOf(sideA);
      const cB = centroidOf(sideB);
      sideA = [];
      sideB = [];
      effectiveCandidates.forEach((candidate) => {
        if (toGroup(candidate, cA, cB) === 'A') sideA.push(candidate);
        else sideB.push(candidate);
      });
    }

    if (!sideA.length || !sideB.length) {
      const sortedByX = effectiveCandidates.slice().sort((a, b) => a.center.x - b.center.x);
      const splitIndex = Math.max(1, Math.floor(sortedByX.length / 2));
      sideA = sortedByX.slice(0, splitIndex);
      sideB = sortedByX.slice(splitIndex);
    }

    const centroidA = centroidOf(sideA);
    const centroidB = centroidOf(sideB);
    const majorAxis =
      centroidA && centroidB
        ? new THREE.Vector2(centroidB.x - centroidA.x, centroidB.z - centroidA.z).normalize()
        : new THREE.Vector2(1, 0);

    const anchorA = resolveAnchorFromFarthestPair(sideA) || resolveAnchorFromAxisExtremes(sideA, majorAxis);
    const anchorB = resolveAnchorFromFarthestPair(sideB) || resolveAnchorFromAxisExtremes(sideB, majorAxis);
    if (!anchorA || !anchorB) return null;

    if (anchorA.x <= anchorB.x) {
      return { left: anchorA, right: anchorB };
    }
    return { left: anchorB, right: anchorA };
  };

  const lowerBandSideAnchors = resolveLowerBandSideAnchors();

  const resolveSideSupportMidpointFromLowerBand = (side, fallbackAnchor) => {
    const resolvedAnchor = side === 'left'
      ? lowerBandSideAnchors?.left
      : lowerBandSideAnchors?.right;
    return resolvedAnchor ? resolvedAnchor.clone() : fallbackAnchor;
  };

  const resolveSideSupportMidpoint = (side, sideCandidates, fallbackAnchor) => {
    const uniqueSide = [];
    for (const candidate of sideCandidates) {
      const duplicated = uniqueSide.some((item) => item.center.distanceToSquared(candidate.center) < mergeThreshold2);
      if (!duplicated) uniqueSide.push(candidate);
    }

    const supportLikeCandidates = uniqueSide.filter((candidate) => candidate.supportLike);
    const fallbackSide = side === 'right' ? 'right' : 'left';
    if (supportLikeCandidates.length < 2) {
      return resolveSideSupportMidpointFromLowerBand(fallbackSide, fallbackAnchor);
    }

    const sideEdgeDistanceLimit = Math.max(sideBandTol * 2.5, spanX * 0.22);
    const edgeNearCandidates = supportLikeCandidates.filter(
      (candidate) => Number(candidate.edgeDistance) <= sideEdgeDistanceLimit
    );
    const effectiveSideCandidates = edgeNearCandidates.length >= 2 ? edgeNearCandidates : supportLikeCandidates;

    const resolved = resolveAnchorFromFarthestPair(effectiveSideCandidates);
    return resolved || resolveSideSupportMidpointFromLowerBand(fallbackSide, fallbackAnchor);
  };

  const resolveSupportFaceOffset = (side, sideCandidates, anchorLocal) => {
    if (!anchorLocal) return null;

    const uniqueSide = [];
    for (const candidate of sideCandidates || []) {
      const duplicated = uniqueSide.some((item) => item.center.distanceToSquared(candidate.center) < mergeThreshold2);
      if (!duplicated) uniqueSide.push(candidate);
    }

    const supportLikeCandidates = uniqueSide.filter((candidate) => candidate.supportLike);
    const sidePool = supportLikeCandidates.length ? supportLikeCandidates : uniqueSide;
    let effectivePool = sidePool;

    if (!effectivePool.length) {
      const fallbackPool = uniqueLowerBandCandidates.filter((candidate) => {
        if (!candidate?.center) return false;
        return side === 'right' ? candidate.center.x >= centerX : candidate.center.x <= centerX;
      });
      effectivePool = fallbackPool.length ? fallbackPool : uniqueLowerBandCandidates;
    }

    if (!effectivePool.length) return null;

    const nearest = effectivePool
      .map((candidate) => ({
        candidate,
        dist2: candidate.center.distanceToSquared(anchorLocal),
      }))
      .sort((a, b) => a.dist2 - b.dist2)
      .slice(0, Math.min(2, effectivePool.length))
      .map((entry) => entry.candidate);

    if (!nearest.length) return null;

    const avgSx = nearest.reduce((sum, candidate) => sum + Math.max(0.001, Number(candidate.sx) || 0.001), 0) / nearest.length;
    const avgSz = nearest.reduce((sum, candidate) => sum + Math.max(0.001, Number(candidate.sz) || 0.001), 0) / nearest.length;
    const radial = new THREE.Vector3(anchorLocal.x - centerX, 0, anchorLocal.z - centerZ);
    const direction = radial.lengthSq() > 1e-10
      ? radial.normalize()
      : new THREE.Vector3(side === 'right' ? 1 : -1, 0, 0);

    const halfDepth = Math.max(0.005, (Math.abs(direction.x) * avgSx + Math.abs(direction.z) * avgSz) * 0.5);
    const faceInset = Math.min(0.004, halfDepth * 0.2);
    const offset = Math.max(0, halfDepth - faceInset);

    return direction.multiplyScalar(offset);
  };

  if (options.preferSupportMidpointPerSide) {
    leftAnchorLocal = resolveSideSupportMidpoint('left', leftSupportCandidates, leftBandAnchor);
    rightAnchorLocal = resolveSideSupportMidpoint('right', rightSupportCandidates, rightBandAnchor);

    if (options.applySupportFaceOffset !== false) {
      const leftFaceOffset = resolveSupportFaceOffset('left', leftSupportCandidates, leftAnchorLocal);
      const rightFaceOffset = resolveSupportFaceOffset('right', rightSupportCandidates, rightAnchorLocal);
      if (leftFaceOffset) leftAnchorLocal.add(leftFaceOffset);
      if (rightFaceOffset) rightAnchorLocal.add(rightFaceOffset);
    }

    if (options.clampToTopSurfaceZ && topSurfaceZRange) {
      leftAnchorLocal.z = THREE.MathUtils.clamp(leftAnchorLocal.z, topSurfaceZRange.minZ, topSurfaceZRange.maxZ);
      rightAnchorLocal.z = THREE.MathUtils.clamp(rightAnchorLocal.z, topSurfaceZRange.minZ, topSurfaceZRange.maxZ);
    }
  }

  if (Boolean(options.preferSupportPair) && uniqueCandidates.length >= 2) {
    uniqueCandidates.sort((a, b) => b.score - a.score);
    const pool = uniqueCandidates.slice(0, Math.min(8, uniqueCandidates.length));
    let bestPair = null;
    let bestDist2 = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < pool.length; i += 1) {
      for (let j = i + 1; j < pool.length; j += 1) {
        const a = pool[i];
        const b = pool[j];
        const dx = a.center.x - b.center.x;
        const dz = a.center.z - b.center.z;
        const dist2 = dx * dx + dz * dz;
        if (dist2 > bestDist2) {
          bestDist2 = dist2;
          bestPair = [a.center.clone(), b.center.clone()];
        }
      }
    }

    if (bestPair) {
      const [c1, c2] = bestPair;
      if (c1.x < c2.x || (Math.abs(c1.x - c2.x) < 0.005 && c1.z < c2.z)) {
        leftAnchorLocal = c1;
        rightAnchorLocal = c2;
      } else {
        leftAnchorLocal = c2;
        rightAnchorLocal = c1;
      }
    }
  }
  const leftAnchorWorld = leftAnchorLocal.clone().applyMatrix4(targetObj.matrixWorld);
  const rightAnchorWorld = rightAnchorLocal.clone().applyMatrix4(targetObj.matrixWorld);

  if (desiredWorldY !== null) {
    leftAnchorWorld.y = desiredWorldY;
    rightAnchorWorld.y = desiredWorldY;
  }

  const localLeft = targetObj.worldToLocal(leftAnchorWorld.clone());
  const localRight = targetObj.worldToLocal(rightAnchorWorld.clone());
  const worldLeft = localLeft.clone().applyMatrix4(targetObj.matrixWorld);
  const worldRight = localRight.clone().applyMatrix4(targetObj.matrixWorld);

  const supportLikeLowerCandidates = uniqueLowerBandCandidates.filter((candidate) => candidate.supportLike);
  const effectiveLowerCandidates =
    supportLikeLowerCandidates.length >= 2 ? supportLikeLowerCandidates : uniqueLowerBandCandidates;

  function resolveAnchorNormalFromNearbySupports(anchorLocal, fallbackLocalNormal) {
    if (!anchorLocal) return fallbackLocalNormal.clone();

    const radial = new THREE.Vector3(anchorLocal.x - centerX, 0, anchorLocal.z - centerZ);
    const radialNormal = radial.lengthSq() > 1e-10 ? radial.normalize() : fallbackLocalNormal.clone();

    if (options.preferRadialNormals) return radialNormal;

    if (!effectiveLowerCandidates.length) return radialNormal;

    const nearest = effectiveLowerCandidates
      .map((candidate) => {
        const dx = candidate.center.x - anchorLocal.x;
        const dz = candidate.center.z - anchorLocal.z;
        return {
          candidate,
          dist2: dx * dx + dz * dz,
        };
      })
      .sort((a, b) => a.dist2 - b.dist2)
      .slice(0, Math.min(4, effectiveLowerCandidates.length))
      .map((entry) => entry.candidate);

    if (nearest.length < 2) return radialNormal;

    let pair = null;
    let bestDist2 = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < nearest.length; i += 1) {
      for (let j = i + 1; j < nearest.length; j += 1) {
        const a = nearest[i].center;
        const b = nearest[j].center;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const dist2 = dx * dx + dz * dz;
        if (dist2 > bestDist2) {
          bestDist2 = dist2;
          pair = [a, b];
        }
      }
    }

    if (!pair) return radialNormal;

    const tangent = new THREE.Vector3(pair[1].x - pair[0].x, 0, pair[1].z - pair[0].z);
    if (tangent.lengthSq() < 1e-10) return radialNormal;

    // La normal del conector debe salir perpendicular al par de soportes
    // y orientarse hacia afuera para mantener consistencia visual en diagonales.
    const tangentDir = tangent.clone().normalize();
    const normalA = new THREE.Vector3(-tangentDir.z, 0, tangentDir.x);
    const normalB = normalA.clone().multiplyScalar(-1);
    return normalA.dot(radialNormal) >= normalB.dot(radialNormal) ? normalA : normalB;
  }

  function snapHorizontalNormalToPrimaryAxis(localNormal, fallbackLocalNormal) {
    const source = localNormal && localNormal.lengthSq() > 1e-10
      ? localNormal.clone()
      : fallbackLocalNormal.clone();
    source.y = 0;
    if (source.lengthSq() < 1e-10) {
      return fallbackLocalNormal.clone().setY(0).normalize();
    }

    const absX = Math.abs(source.x);
    const absZ = Math.abs(source.z);
    if (absX >= absZ) {
      const signX = source.x >= 0 ? 1 : -1;
      return new THREE.Vector3(signX, 0, 0);
    }

    const signZ = source.z >= 0 ? 1 : -1;
    return new THREE.Vector3(0, 0, signZ);
  }

  let localNormalLeft = resolveAnchorNormalFromNearbySupports(localLeft, new THREE.Vector3(-1, 0, 0));
  let localNormalRight = resolveAnchorNormalFromNearbySupports(localRight, new THREE.Vector3(1, 0, 0));

  if (options.snapNormalsToPrimaryAxis) {
    localNormalLeft = snapHorizontalNormalToPrimaryAxis(localNormalLeft, new THREE.Vector3(-1, 0, 0));
    localNormalRight = snapHorizontalNormalToPrimaryAxis(localNormalRight, new THREE.Vector3(1, 0, 0));
  }

  const normalLeft = localNormalLeft.clone().applyQuaternion(worldQuaternion).normalize();
  const normalRight = localNormalRight.clone().applyQuaternion(worldQuaternion).normalize();

  return {
    localLeft,
    localRight,
    worldLeft,
    worldRight,
    localNormalLeft,
    localNormalRight,
    normalLeft,
    normalRight,
  };
}

function resolveMoreaChairSidePorts(targetObj, worldQuaternion) {
  const seatPorts = resolveMoreaSidePortsCore(targetObj, worldQuaternion, {
    meshFilter: (node) => nodeBelongsToRole(node, targetObj, 'seat'),
    desiredWorldY: 0.34,
  });

  if (seatPorts) return seatPorts;

  return resolveMoreaSidePortsCore(targetObj, worldQuaternion, {
    desiredWorldY: 0.34,
  });
}

function resolveMoreaGiroSidePorts(targetObj, worldQuaternion, options = {}) {
  return resolveMoreaSidePortsCore(targetObj, worldQuaternion, {
    preferSupportMidpointPerSide: true,
    clampToTopSurfaceZ: true,
    preferRadialNormals: true,
    applySupportFaceOffset: false,
    snapNormalsToPrimaryAxis: Boolean(options.snapNormalsToPrimaryAxis),
  });
}

function flattenHorizontalNormal(normal, fallbackX = 1) {
  const flat = normal.clone();
  flat.y = 0;
  if (flat.lengthSq() < 1e-10) {
    flat.set(fallbackX >= 0 ? 1 : -1, 0, 0);
  }
  return flat.normalize();
}

function resolveOutwardLocalNormalForAnchor(localPos, localBounds, fallback = null) {
  if (!localPos || !localBounds) {
    return (fallback || new THREE.Vector3(1, 0, 0)).clone().normalize();
  }

  const centerX = (localBounds.min.x + localBounds.max.x) * 0.5;
  const centerZ = (localBounds.min.z + localBounds.max.z) * 0.5;
  const radial = new THREE.Vector3(localPos.x - centerX, 0, localPos.z - centerZ);
  if (radial.lengthSq() > 1e-8) return radial.normalize();

  const sideDistances = [
    {
      distance: Math.abs(localPos.x - localBounds.min.x),
      normal: new THREE.Vector3(-1, 0, 0),
    },
    {
      distance: Math.abs(localPos.x - localBounds.max.x),
      normal: new THREE.Vector3(1, 0, 0),
    },
    {
      distance: Math.abs(localPos.z - localBounds.min.z),
      normal: new THREE.Vector3(0, 0, -1),
    },
    {
      distance: Math.abs(localPos.z - localBounds.max.z),
      normal: new THREE.Vector3(0, 0, 1),
    },
  ];

  sideDistances.sort((a, b) => a.distance - b.distance);
  const best = sideDistances[0];
  if (!best || !Number.isFinite(best.distance)) {
    return (fallback || new THREE.Vector3(1, 0, 0)).clone().normalize();
  }

  return best.normal;
}

function resolveActiveMilaQuantity(activeAssembly) {
  return clampMilaQuantity(
    activeAssembly?.userData?.config?.quantity || activeAssembly?.userData?.quantity || 1
  );
}

function resolvePanelSidePorts(targetConnectors, side) {
  return Object.values(targetConnectors?.ports || {})
    .filter((port) => port?.portType === 'panel-wall' && port.side === side)
    .sort((a, b) => Number(a.seatIndex || 0) - Number(b.seatIndex || 0));
}

function resolvePanelDivisorTargetPort({ targetConnectors, targetPort }) {
  if (!targetConnectors?.isPanelDivisor || targetPort?.portType !== 'panel-wall') {
    return targetPort;
  }

  const sidePorts = resolvePanelSidePorts(targetConnectors, targetPort.side);
  if (!sidePorts.length) return targetPort;

  // El snap del panel divisor debe usar el mismo puerto visible en pared.
  return sidePorts.find((port) => Number(port.seatIndex || 0) === 0) || targetPort;
}

function resolvePanelDivisorPorts(targetObj) {
  const config = targetObj?.userData?.config || {};
  // Mostrar conectores en cualquier variante de panel divisor: mínimo 1 por lado.
  const seatsLeft = Math.max(1, clampPanelSeats(config.seatsLeft));
  const seatsRight = Math.max(1, clampPanelSeats(config.seatsRight));

  const ports = {};

  const addSidePorts = ({ side, seatCount, zSign }) => {
    if (seatCount <= 0) return;

    for (let seatIndex = 0; seatIndex < seatCount; seatIndex += 1) {
      const localPos = new THREE.Vector3(
        PANEL_DIVISOR_CONNECTOR_TUNE.panelBackFaceXM -
          PANEL_DIVISOR_CONNECTOR_TUNE.wallInsetM -
          seatIndex * PANEL_DIVISOR_CONNECTOR_TUNE.moduleSpacingM,
        0.14,
        zSign * PANEL_DIVISOR_CONNECTOR_TUNE.sideCenterZM
      );

      const localNormal = new THREE.Vector3(-1, 0, 0);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal
        .clone()
        .applyQuaternion(targetObj.getWorldQuaternion(new THREE.Quaternion()))
        .normalize();

      const id = `${side}_${seatIndex + 1}`;
      ports[id] = {
        id,
        side,
        seatIndex,
        portType: 'panel-wall',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
    }
  };

  addSidePorts({ side: 'left', seatCount: seatsLeft, zSign: 1 });
  addSidePorts({ side: 'right', seatCount: seatsRight, zSign: -1 });

  return ports;
}

/**
 * Helper para obtener el ángulo de rotación Yaw (alrededor de Y) de un vector en Three.js
 */
export function getVectorYaw(v) {
  return Math.atan2(-v.z, v.x);
}

/**
 * Crea la figura 3D sólida de un conector circular lateral
 * Su orientación base tiene la cara circular apuntando hacia +X (Vector3(1, 0, 0))
 * Renderizado con depthTest: true y depthWrite: true para que respete la profundidad 3D real
 */
export function createMilaConnectorMesh({ side = 'left' } = {}) {
  const group = new THREE.Group();
  group.name = `MILA_CONNECTOR_${side.toUpperCase()}`;

  // 1. Cuerpo cilíndrico principal horizontal
  const cylinderGeom = new THREE.CylinderGeometry(
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M,
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M,
    MILA_CONNECTOR_CONFIG.CONNECTOR_THICKNESS_M,
    32
  );
  cylinderGeom.rotateZ(-Math.PI / 2);

  // 2. Bisel / aro exterior redondeado
  const ringGeom = new THREE.TorusGeometry(
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M,
    0.006,
    16,
    32
  );
  ringGeom.rotateY(Math.PI / 2);

  // 3. Núcleo circular central (socket/pin de acople)
  const coreGeom = new THREE.CylinderGeometry(
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M * 0.55,
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M * 0.55,
    MILA_CONNECTOR_CONFIG.CONNECTOR_THICKNESS_M + 0.004,
    32
  );
  coreGeom.rotateZ(-Math.PI / 2);

  // Materiales sólidos opacos con prueba y escritura de profundidad
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: MILA_CONNECTOR_CONFIG.COLOR_NORMAL,
    roughness: 0.3,
    metalness: 0.2,
    depthTest: true,
    depthWrite: true,
  });

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: MILA_CONNECTOR_CONFIG.CORE_COLOR_NORMAL,
    roughness: 0.35,
    metalness: 0.25,
    depthTest: true,
    depthWrite: true,
  });

  const cylinderMesh = new THREE.Mesh(cylinderGeom, bodyMaterial);
  cylinderMesh.castShadow = true;
  cylinderMesh.receiveShadow = true;

  const ringMesh = new THREE.Mesh(ringGeom, bodyMaterial);
  ringMesh.castShadow = true;
  ringMesh.receiveShadow = true;

  const coreMesh = new THREE.Mesh(coreGeom, coreMaterial);
  coreMesh.userData = { isConnectorCore: true };
  coreMesh.castShadow = true;
  coreMesh.receiveShadow = true;

  group.add(cylinderMesh, ringMesh, coreMesh);

  group.userData = {
    isMilaConnector: true,
    side,
    excludeFromBOM: true,
  };

  return group;
}

/**
 * Obtiene el nodo raíz del ensamble, accesorio o superficie de giro Mila.
 */
export function getMilaAssemblyRoot(object) {
  if (!object) return null;

  let curr = object;
  while (curr && curr.parent && curr.parent.type !== 'Scene' && curr !== curr.parent) {
    const r = String(curr.userData?.meta?.role || curr.userData?.role || '').toLowerCase();
    if (
      curr.userData?.kind === 'MILA_ASSEMBLY' ||
      curr.userData?.kind === 'MOREA_ASSEMBLY' ||
      curr.userData?.kind === 'MILA_GIRO_SURFACE' ||
      curr.userData?.kind === 'MOREA_GIRO_SURFACE' ||
      curr.userData?.type === 'mila' ||
      curr.userData?.type === 'morea' ||
      curr.userData?.type === 'MILA_GIRO_SURFACE' ||
      curr.userData?.type === 'MOREA_GIRO_SURFACE' ||
      r === 'giro-surface' ||
      r === 'armrest-left' ||
      r === 'armrest-right' ||
      r === 'armrest-center' ||
      r === 'screen'
    ) {
      return curr;
    }
    curr = curr.parent;
  }

  const role = String(curr?.userData?.meta?.role || curr?.userData?.role || '').toLowerCase();
  const isPanelDivisor =
    curr?.userData?.kind === 'MILA_PANEL_DIVISOR_ASSEMBLY' ||
    curr?.userData?.type === 'mila-panel-divisor' ||
    role === 'panel-divisor' ||
    role === 'booth-table';

  if (isPanelDivisor) {
    return curr;
  }

  if (
    curr?.userData?.kind === 'MILA_ASSEMBLY' ||
    curr?.userData?.kind === 'MOREA_ASSEMBLY' ||
    curr?.userData?.kind === 'MILA_GIRO_SURFACE' ||
    curr?.userData?.kind === 'MOREA_GIRO_SURFACE' ||
    curr?.userData?.type === 'mila' ||
    curr?.userData?.type === 'morea' ||
    curr?.userData?.type === 'MILA_GIRO_SURFACE' ||
    curr?.userData?.type === 'MOREA_GIRO_SURFACE' ||
    role === 'giro-surface' ||
    role === 'armrest-left' ||
    role === 'armrest-right' ||
    role === 'armrest-center' ||
    role === 'screen' ||
    String(curr?.userData?.line || '').toUpperCase() === 'MILA'
  ) {
    return curr;
  }

  const parentAssemblyId =
    object.userData?.parentAssemblyId || object.userData?.meta?.parentAssemblyId;
  if (parentAssemblyId) {
    let root = object;
    while (root.parent) root = root.parent;
    let found = null;
    root.traverse((node) => {
      if (
        !found &&
        (node.userData?.instanceId === parentAssemblyId || node.uuid === parentAssemblyId)
      ) {
        found = node;
      }
    });
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Resuelve los conectores de un objeto Mila (Silla, Giro o Accesorio individual).
 */
export function resolveMilaAssemblyConnectors(object) {
  if (!object) return null;

  const targetObj = getMilaAssemblyRoot(object);
  if (!targetObj) return null;

  const isPanelDivisor =
    targetObj.userData?.kind === 'MILA_PANEL_DIVISOR_ASSEMBLY' ||
    targetObj.userData?.type === 'mila-panel-divisor';

  if (isPanelDivisor) {
    targetObj.updateMatrixWorld(true);
    const ports = resolvePanelDivisorPorts(targetObj);
    if (!Object.keys(ports).length) return null;

    return {
      assembly: targetObj,
      isGiro: false,
      isAccessory: false,
      isPanelDivisor: true,
      connectorY: 0.14,
      ports,
    };
  }

  const role = String(targetObj.userData?.meta?.role || targetObj.userData?.role || '').toLowerCase();
  const isMorea = isMoreaObject(targetObj);
  const isMilaLine = String(targetObj.userData?.line || '').toUpperCase() === 'MILA';

  const isGiro =
    targetObj.userData?.kind === 'MILA_GIRO_SURFACE' ||
    targetObj.userData?.kind === 'MOREA_GIRO_SURFACE' ||
    targetObj.userData?.type === 'MILA_GIRO_SURFACE' ||
    targetObj.userData?.type === 'MOREA_GIRO_SURFACE' ||
    role === 'giro-surface';

  const isAccessory =
    role === 'armrest-left' ||
    role === 'armrest-right' ||
    role === 'armrest-center' ||
    role === 'screen';

  const isMila =
    isGiro ||
    isAccessory ||
    isMorea ||
    targetObj.userData?.kind === 'MILA_ASSEMBLY' ||
    targetObj.userData?.type === 'mila' ||
    String(targetObj.userData?.line || '').toUpperCase() === 'MILA';

  if (!isMila) return null;

  targetObj.updateMatrixWorld(true);
  const worldQuaternion = targetObj.getWorldQuaternion(new THREE.Quaternion());
  const yaw = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ').y;
  const chairConnectorY = 0.14;
  const chairConnectorZ = -0.36;

  // ─────────────────────────────────────────────────────────
  // CASO A: Superficie de Giro Mila
  // ─────────────────────────────────────────────────────────
  if (isGiro) {
    if (isMorea && !isMilaLine) {
      const requestedAngleDeg = Number(
        targetObj.userData?.angleDeg || targetObj.userData?.meta?.angleDeg || 60
      );
      const inferredAliasBaseAngle =
        requestedAngleDeg === 120
          ? 60
          : requestedAngleDeg === 135
            ? 45
            : requestedAngleDeg === 270
              ? 150
              : null;
      const connectorAngleDeg = Number(
        targetObj.userData?.connectorAngleDeg ||
          targetObj.userData?.meta?.connectorAngleDeg ||
          inferredAliasBaseAngle ||
          requestedAngleDeg ||
          60
      );
      const invertConnectorFacing = Boolean(
        targetObj.userData?.invertConnectorFacing ??
          targetObj.userData?.meta?.invertConnectorFacing ??
          Number.isFinite(inferredAliasBaseAngle)
      );
      const moreaVariant = String(
        targetObj.userData?.moreaVariant || targetObj.userData?.meta?.moreaVariant || 'single'
      )
        .trim()
        .toLowerCase();

      const sidePorts = resolveMoreaGiroSidePorts(targetObj, worldQuaternion, {
        // En 90° (simple y doble) forzamos ejes primarios para estabilizar
        // la orientación de conectores y evitar inversiones al acoplar.
        snapNormalsToPrimaryAxis: connectorAngleDeg === 90,
      });
      if (!sidePorts) return null;

      const localBounds = resolveObjectLocalBounds(targetObj);
      const localNormalLeft =
        sidePorts.localNormalLeft ||
        resolveOutwardLocalNormalForAnchor(
          sidePorts.localLeft,
          localBounds,
          new THREE.Vector3(-1, 0, 0)
        );
      const localNormalRight =
        sidePorts.localNormalRight ||
        resolveOutwardLocalNormalForAnchor(
          sidePorts.localRight,
          localBounds,
          new THREE.Vector3(1, 0, 0)
        );

      const shouldFaceBack = connectorAngleDeg === 90 && moreaVariant === 'double';

      const localAvgNormal = localNormalLeft
        .clone()
        .add(localNormalRight)
        .multiplyScalar(0.5);
      const effectiveAvgLocalNormal =
        localAvgNormal.lengthSq() > 1e-10 ? localAvgNormal.normalize() : localNormalLeft.clone();
      const facesBackNow = effectiveAvgLocalNormal.z > 0;
      const mustFlipNormals = shouldFaceBack ? !facesBackNow : facesBackNow;

      const finalLocalNormalLeft = mustFlipNormals
        ? localNormalLeft.clone().multiplyScalar(-1)
        : localNormalLeft.clone();
      const finalLocalNormalRight = mustFlipNormals
        ? localNormalRight.clone().multiplyScalar(-1)
        : localNormalRight.clone();

      if (invertConnectorFacing) {
        finalLocalNormalLeft.multiplyScalar(-1);
        finalLocalNormalRight.multiplyScalar(-1);
      }

      const worldNormalLeft = flattenHorizontalNormal(
        finalLocalNormalLeft.clone().applyQuaternion(worldQuaternion),
        finalLocalNormalLeft.x || -1
      );
      const worldNormalRight = flattenHorizontalNormal(
        finalLocalNormalRight.clone().applyQuaternion(worldQuaternion),
        finalLocalNormalRight.x || 1
      );

      const isTerminalSurface = connectorAngleDeg === 180;
      const localCenter = sidePorts.localLeft.clone().lerp(sidePorts.localRight, 0.5);
      const worldCenter = localCenter.clone().applyMatrix4(targetObj.matrixWorld);
      const centerLocalNormal = finalLocalNormalLeft
        .clone()
        .add(finalLocalNormalRight)
        .multiplyScalar(0.5);
      const effectiveCenterLocalNormal =
        centerLocalNormal.lengthSq() > 1e-10
          ? centerLocalNormal.normalize()
          : finalLocalNormalLeft.clone();
      const centerWorldNormal = flattenHorizontalNormal(
        effectiveCenterLocalNormal.clone().applyQuaternion(worldQuaternion),
        effectiveCenterLocalNormal.x || -1
      );

      const ports = isTerminalSurface
        ? {
            center: {
              id: 'center',
              portType: 'giro',
              localPos: localCenter,
              localNormal: effectiveCenterLocalNormal,
              worldPos: worldCenter,
              worldNormal: centerWorldNormal,
            },
          }
        : {
            left: {
              id: 'left',
              portType: 'giro',
              localPos: sidePorts.localLeft,
              localNormal: finalLocalNormalLeft,
              worldPos: sidePorts.worldLeft,
              worldNormal: worldNormalLeft,
            },
            right: {
              id: 'right',
              portType: 'giro',
              localPos: sidePorts.localRight,
              localNormal: finalLocalNormalRight,
              worldPos: sidePorts.worldRight,
              worldNormal: worldNormalRight,
            },
          };

      return {
        assembly: targetObj,
        isGiro: true,
        isAccessory: false,
        isMorea: true,
        localLeft: isTerminalSurface ? localCenter : sidePorts.localLeft,
        localRight: isTerminalSurface ? localCenter : sidePorts.localRight,
        worldLeft: isTerminalSurface ? worldCenter : sidePorts.worldLeft,
        worldRight: isTerminalSurface ? worldCenter : sidePorts.worldRight,
        normalLeft: isTerminalSurface ? centerWorldNormal : worldNormalLeft,
        normalRight: isTerminalSurface ? centerWorldNormal : worldNormalRight,
        connectorY: isTerminalSurface ? localCenter.y : sidePorts.localLeft.y,
        yaw,
        ports,
      };
    }

    const angleDeg = Number(
      targetObj.userData?.angleDeg || targetObj.userData?.meta?.angleDeg || 60
    );
    const angleRad = (angleDeg * Math.PI) / 180;
    const tune = MILA_GIRO_CONNECTOR_TUNE[angleDeg] || MILA_GIRO_CONNECTOR_TUNE[60];

    const tuneA = tune.portA;
    const tuneB = tune.portB;

    const localLeft = new THREE.Vector3(Number(tuneA.x), Number(tuneA.y), Number(tuneA.z));
    const localRight = new THREE.Vector3(Number(tuneB.x), Number(tuneB.y), Number(tuneB.z));

    const worldLeft = localLeft.clone().applyMatrix4(targetObj.matrixWorld);
    const worldRight = localRight.clone().applyMatrix4(targetObj.matrixWorld);

    const localNormalLeft = tuneA.normal
      ? new THREE.Vector3(tuneA.normal.x, tuneA.normal.y, tuneA.normal.z).normalize()
      : new THREE.Vector3(Math.cos(tuneA.rotY || 0), 0, -Math.sin(tuneA.rotY || 0)).normalize();

    const localNormalRight = tuneB.normal
      ? new THREE.Vector3(tuneB.normal.x, tuneB.normal.y, tuneB.normal.z).normalize()
      : new THREE.Vector3(Math.cos(tuneB.rotY || 0), 0, -Math.sin(tuneB.rotY || 0)).normalize();

    const normalLeft = localNormalLeft.clone().applyQuaternion(worldQuaternion).normalize();
    const normalRight = localNormalRight.clone().applyQuaternion(worldQuaternion).normalize();

    return {
      assembly: targetObj,
      isGiro: true,
      isAccessory: false,
      angleDeg,
      angleRad,
      localLeft,
      localRight,
      worldLeft,
      worldRight,
      normalLeft,
      normalRight,
      connectorY: Number(tuneA.y),
      yaw,
      ports: {
        left: {
          id: 'left',
          portType: 'giro',
          localPos: localLeft,
          localNormal: localNormalLeft,
          worldPos: worldLeft,
          worldNormal: normalLeft,
        },
        right: {
          id: 'right',
          portType: 'giro',
          localPos: localRight,
          localNormal: localNormalRight,
          worldPos: worldRight,
          worldNormal: normalRight,
        },
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // CASO B: Accesorios individuales Mila (Apoyabrazos / Pantallas)
  // ─────────────────────────────────────────────────────────
  if (isAccessory) {
    const ports = {};

    if (role === 'armrest-left') {
      // Conector hacia la derecha (+X) para acoplarse al lateral izquierdo de la silla
      const localPos = new THREE.Vector3(0.120, chairConnectorY, chairConnectorZ);
      const localNormal = new THREE.Vector3(1, 0, 0);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal.clone().applyQuaternion(worldQuaternion).normalize();
      ports.right = {
        id: 'right',
        portType: 'armrest-left',
        targetPortType: 'left',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
      return {
        assembly: targetObj,
        isGiro: false,
        isAccessory: true,
        accessoryRole: 'armrest-left',
        worldRight: worldPos,
        normalRight: worldNormal,
        connectorY: chairConnectorY,
        yaw,
        ports,
      };
    }

    if (role === 'armrest-right') {
      // Conector hacia la izquierda (-X) para acoplarse al lateral derecho de la silla
      const localPos = new THREE.Vector3(0.0368, chairConnectorY, chairConnectorZ);
      const localNormal = new THREE.Vector3(-1, 0, 0);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal.clone().applyQuaternion(worldQuaternion).normalize();
      ports.left = {
        id: 'left',
        portType: 'armrest-right',
        targetPortType: 'right',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
      return {
        assembly: targetObj,
        isGiro: false,
        isAccessory: true,
        accessoryRole: 'armrest-right',
        worldLeft: worldPos,
        normalLeft: worldNormal,
        connectorY: chairConnectorY,
        yaw,
        ports,
      };
    }

    if (role === 'armrest-center') {
      // Conector hacia atrás (-Z) para acoplarse a la unión entre puestos de la silla
      const userOffsetZ = Number(MILA_ACCESSORY_OFFSETS_MM.armrestCenter.z || -80) / 1000;
      const localPos = new THREE.Vector3(0.060, chairConnectorY, chairConnectorZ - userOffsetZ);
      const localNormal = new THREE.Vector3(0, 0, -1);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal.clone().applyQuaternion(worldQuaternion).normalize();
      ports.center = {
        id: 'center',
        portType: 'armrest-center',
        targetPortType: 'seam',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
      return {
        assembly: targetObj,
        isGiro: false,
        isAccessory: true,
        accessoryRole: 'armrest-center',
        worldLeft: worldPos,
        normalLeft: worldNormal,
        connectorY: chairConnectorY,
        yaw,
        ports,
      };
    }

    if (role === 'screen') {
      // Conector hacia adelante (+Z) para acoplarse al espaldar de la silla
      const localPos = new THREE.Vector3(0, chairConnectorY, 0);
      const localNormal = new THREE.Vector3(0, 0, 1);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal.clone().applyQuaternion(worldQuaternion).normalize();
      ports.screen = {
        id: 'screen',
        portType: 'screen',
        targetPortType: 'screen',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
      return {
        assembly: targetObj,
        isGiro: false,
        isAccessory: true,
        accessoryRole: 'screen',
        worldLeft: worldPos,
        normalLeft: worldNormal,
        connectorY: chairConnectorY,
        yaw,
        ports,
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  // CASO C: Ensamble Silla Mila (1 a 4 puestos)
  // ─────────────────────────────────────────────────────────
  let hasArmrestLeft = false;
  let hasArmrestRight = false;
  let hasArmrestCenter = false;
  let hasScreen = false;

  targetObj.traverse((node) => {
    if (node === targetObj) return;
    const r = String(node.userData?.meta?.role || node.userData?.role || '').toLowerCase();
    if (r === 'armrest-left') hasArmrestLeft = true;
    if (r === 'armrest-right') hasArmrestRight = true;
    if (r === 'armrest-center') hasArmrestCenter = true;
    if (r === 'screen') hasScreen = true;
  });

  if (isMorea) {
    const sidePorts = resolveMoreaChairSidePorts(targetObj, worldQuaternion);
    if (!sidePorts) return null;

    return {
      assembly: targetObj,
      isGiro: false,
      isAccessory: false,
      isMorea: true,
      hasArmrestLeft: false,
      hasArmrestRight: false,
      hasArmrestCenter: false,
      hasScreen: false,
      localLeft: sidePorts.localLeft,
      localRight: sidePorts.localRight,
      worldLeft: sidePorts.worldLeft,
      worldRight: sidePorts.worldRight,
      normalLeft: sidePorts.normalLeft,
      normalRight: sidePorts.normalRight,
      connectorY: sidePorts.localLeft.y,
      yaw,
      ports: {
        left: {
          id: 'left',
          portType: 'left',
          isOccupied: false,
          localPos: sidePorts.localLeft,
          localNormal: new THREE.Vector3(-1, 0, 0),
          worldPos: sidePorts.worldLeft,
          worldNormal: sidePorts.normalLeft,
        },
        right: {
          id: 'right',
          portType: 'right',
          isOccupied: false,
          localPos: sidePorts.localRight,
          localNormal: new THREE.Vector3(1, 0, 0),
          worldPos: sidePorts.worldRight,
          worldNormal: sidePorts.normalRight,
        },
      },
    };
  }

  const quantity = Math.max(1, Number(targetObj.userData?.config?.quantity || targetObj.userData?.quantity || 1));
  const moduleSpacingM = Number(targetObj.userData?.config?.moduleSpacingMm || 600) / 1000;
  const totalWidthM = quantity * moduleSpacingM;

  const localLeft = new THREE.Vector3(0, chairConnectorY, chairConnectorZ);
  const localRight = new THREE.Vector3(totalWidthM, chairConnectorY, chairConnectorZ);
  const localScreen = new THREE.Vector3(0.300, chairConnectorY, -0.720);

  const localNormalLeft = new THREE.Vector3(-1, 0, 0);
  const localNormalRight = new THREE.Vector3(1, 0, 0);
  const localNormalScreen = new THREE.Vector3(0, 0, -1);

  const worldLeft = localLeft.clone().applyMatrix4(targetObj.matrixWorld);
  const worldRight = localRight.clone().applyMatrix4(targetObj.matrixWorld);
  const worldScreen = localScreen.clone().applyMatrix4(targetObj.matrixWorld);
  const normalLeft = localNormalLeft.clone().applyQuaternion(worldQuaternion).normalize();
  const normalRight = localNormalRight.clone().applyQuaternion(worldQuaternion).normalize();
  const normalScreen = localNormalScreen.clone().applyQuaternion(worldQuaternion).normalize();

  const ports = {
    left: {
      id: 'left',
      portType: 'left',
      isOccupied: hasArmrestLeft,
      localPos: localLeft,
      localNormal: localNormalLeft,
      worldPos: worldLeft,
      worldNormal: normalLeft,
    },
    right: {
      id: 'right',
      portType: 'right',
      isOccupied: hasArmrestRight,
      localPos: localRight,
      localNormal: localNormalRight,
      worldPos: worldRight,
      worldNormal: normalRight,
    },
    screen: {
      id: 'screen',
      portType: 'screen',
      isOccupied: hasScreen,
      localPos: localScreen,
      localNormal: localNormalScreen,
      worldPos: worldScreen,
      worldNormal: normalScreen,
    },
  };

  // Puertos intermedios para apoyabrazos centrales (si tiene 2 o más puestos)
  if (quantity >= 2) {
    for (let seamIndex = 1; seamIndex < quantity; seamIndex += 1) {
      const seamX = seamIndex * moduleSpacingM;
      const localSeam = new THREE.Vector3(seamX, chairConnectorY, chairConnectorZ);
      const localNormalSeam = new THREE.Vector3(0, 0, 1);
      const worldSeam = localSeam.clone().applyMatrix4(targetObj.matrixWorld);
      const normalSeam = localNormalSeam.clone().applyQuaternion(worldQuaternion).normalize();

      ports[`seam_${seamIndex}`] = {
        id: `seam_${seamIndex}`,
        portType: 'seam',
        seamIndex,
        isOccupied: hasArmrestCenter,
        localPos: localSeam,
        localNormal: localNormalSeam,
        worldPos: worldSeam,
        worldNormal: normalSeam,
      };
    }
  }

  return {
    assembly: targetObj,
    isGiro: false,
    isAccessory: false,
    hasArmrestLeft,
    hasArmrestRight,
    hasArmrestCenter,
    hasScreen,
    localLeft,
    localRight,
    localScreen,
    worldLeft,
    worldRight,
    worldScreen,
    normalLeft,
    normalRight,
    normalScreen,
    connectorY: chairConnectorY,
    yaw,
    ports,
  };
}

/**
 * Determina si un puerto específico en coordenadas de mundo ya está ocupado
 */
export function isMilaPortOccupied(
  portWorldPos,
  targetAssembly,
  allCandidates = [],
  thresholdM = 0.12,
  ignoredObjects = []
) {
  if (!portWorldPos || !targetAssembly) return false;

  const ignoredSet = new Set((ignoredObjects || []).filter(Boolean));

  // 1. Si el objeto mismo tiene puertos marcados como isOccupied (por tener accesorios instalados)
  const targetConnectors = resolveMilaAssemblyConnectors(targetAssembly);
  if (targetConnectors?.ports) {
    for (const key of Object.keys(targetConnectors.ports)) {
      const p = targetConnectors.ports[key];
      if (p && p.worldPos && p.isOccupied) {
        const dist2D = new THREE.Vector2(
          portWorldPos.x - p.worldPos.x,
          portWorldPos.z - p.worldPos.z
        ).length();
        if (dist2D < 0.06) {
          return true;
        }
      }
    }
  }

  // 2. Verificar proximidad con cualquier otro objeto de la escena
  for (const candidate of allCandidates) {
    if (!candidate || candidate === targetAssembly) continue;
    if (ignoredSet.has(candidate)) continue;
    const candidateConnectors = resolveMilaAssemblyConnectors(candidate);
    if (!candidateConnectors || !candidateConnectors.ports) continue;

    for (const portKey of Object.keys(candidateConnectors.ports)) {
      const p = candidateConnectors.ports[portKey];
      if (p && p.worldPos) {
        const dist2D = new THREE.Vector2(
          portWorldPos.x - p.worldPos.x,
          portWorldPos.z - p.worldPos.z
        ).length();
        const distY = Math.abs(portWorldPos.y - p.worldPos.y);
        if (dist2D < thresholdM && distY < 0.35) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Valida si dos puertos son compatibles para acoplarse entre sí
 */
function areMilaPortsCompatible(actPort, tgtPort) {
  if (!actPort || !tgtPort) return false;

  // Si el puerto activo exige un tipo de puerto destino específico:
  if (actPort.targetPortType) {
    return tgtPort.portType === actPort.targetPortType || tgtPort.id === actPort.targetPortType;
  }

  // Si el puerto destino exige un tipo específico:
  if (tgtPort.targetPortType) {
    return actPort.portType === tgtPort.targetPortType || actPort.id === tgtPort.targetPortType;
  }

  // Puertos laterales normales (silla izquierda/derecha y superficie de giro izquierda/derecha):
  const actIsSide =
    actPort.id === 'left' || actPort.id === 'right' || actPort.portType === 'giro';
  const tgtIsSide =
    tgtPort.id === 'left' ||
    tgtPort.id === 'right' ||
    tgtPort.portType === 'giro' ||
    tgtPort.portType === 'panel-wall';
  return actIsSide && tgtIsSide;
}

/**
 * Evalúa y calcula el mejor snap entre un objeto Mila activo (silla, giro o accesorio)
 * y todos los demás elementos Mila de la escena.
 */
export function findBestMilaConnectorSnap({
  activeAssembly,
  allAssemblies = [],
  allGiroSurfaces = [],
  allAccessories = [],
  allPanelDivisors = [],
  snapRadius = MILA_CONNECTOR_CONFIG.SNAP_RADIUS_M,
}) {
  if (!activeAssembly) return null;

  const activeConnectors = resolveMilaAssemblyConnectors(activeAssembly);
  if (!activeConnectors || !activeConnectors.ports) return null;

  const activeGroupId = activeAssembly.userData?.groupId;
  const allCandidates = [...allAssemblies, ...allGiroSurfaces, ...allAccessories, ...allPanelDivisors];
  const activeLocalBounds = resolveObjectLocalBounds(activeAssembly);
  const activeLocalCenter = activeLocalBounds?.getCenter(new THREE.Vector3()) || null;
  const activeLocalCorners = activeLocalBounds
    ? [
        new THREE.Vector3(activeLocalBounds.min.x, activeLocalBounds.min.y, activeLocalBounds.min.z),
        new THREE.Vector3(activeLocalBounds.min.x, activeLocalBounds.min.y, activeLocalBounds.max.z),
        new THREE.Vector3(activeLocalBounds.min.x, activeLocalBounds.max.y, activeLocalBounds.min.z),
        new THREE.Vector3(activeLocalBounds.min.x, activeLocalBounds.max.y, activeLocalBounds.max.z),
        new THREE.Vector3(activeLocalBounds.max.x, activeLocalBounds.min.y, activeLocalBounds.min.z),
        new THREE.Vector3(activeLocalBounds.max.x, activeLocalBounds.min.y, activeLocalBounds.max.z),
        new THREE.Vector3(activeLocalBounds.max.x, activeLocalBounds.max.y, activeLocalBounds.min.z),
        new THREE.Vector3(activeLocalBounds.max.x, activeLocalBounds.max.y, activeLocalBounds.max.z),
      ]
    : null;

  let bestSnap = null;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestOutsideSnap = null;
  let bestOutsideScore = Number.POSITIVE_INFINITY;

  const activePortList = Object.values(activeConnectors.ports);

  for (const targetObj of allCandidates) {
    if (!targetObj || targetObj === activeAssembly) continue;

    // No hacer snap contra objetos que ya pertenecen al mismo groupId
    if (activeGroupId && targetObj.userData?.groupId === activeGroupId) {
      continue;
    }

    const targetConnectors = resolveMilaAssemblyConnectors(targetObj);
    if (!targetConnectors || !targetConnectors.ports) continue;

    const targetPortList = Object.values(targetConnectors.ports);

    for (const actPort of activePortList) {
      if (actPort.isOccupied) continue;

      for (const tgtPort of targetPortList) {
        if (tgtPort.isOccupied) continue;

        const effectiveTargetPort = resolvePanelDivisorTargetPort({
          targetConnectors,
          targetPort: tgtPort,
          activeAssembly,
        });

        // Comprobar compatibilidad de roles entre puertos
        if (!areMilaPortsCompatible(actPort, effectiveTargetPort)) {
          continue;
        }

        // Ignorar puertos objetivo ocupados por otra pieza
        if (
          isMilaPortOccupied(
            effectiveTargetPort.worldPos,
            targetObj,
            allCandidates,
            0.12,
            [activeAssembly]
          )
        ) {
          continue;
        }

        const dist = new THREE.Vector2(
          actPort.worldPos.x - effectiveTargetPort.worldPos.x,
          actPort.worldPos.z - effectiveTargetPort.worldPos.z
        ).length();

        if (dist <= snapRadius) {
          const isAccessorySnap = Boolean(activeConnectors.isAccessory || targetConnectors.isAccessory);
          const isGiroSnap = Boolean(activeConnectors.isGiro || targetConnectors.isGiro);
          const isPanelDivisorSnap = Boolean(
            activeConnectors.isPanelDivisor || targetConnectors.isPanelDivisor
          );
          const isMixedGiroChairSnap =
            Boolean(activeConnectors.isGiro) !== Boolean(targetConnectors.isGiro) &&
            !activeConnectors.isAccessory &&
            !targetConnectors.isAccessory &&
            !activeConnectors.isPanelDivisor &&
            !targetConnectors.isPanelDivisor;
          const isStrictMoreaGiroChairSnap =
            isMixedGiroChairSnap &&
            Boolean(activeConnectors.isMorea || targetConnectors.isMorea);
          const giroDropM = isStrictMoreaGiroChairSnap
            ? 0
            : (Number(MILA_GIRO_TUNE?.CONNECTED_Y_OFFSET_MM) || 0) / 1000;

          // Solución matemática exacta en 2D (plano XZ) para rotar el vector normal local del puerto activo
          // hasta que quede opuesto al vector normal del puerto objetivo (normalActiva = -normalObjetivo):
          const Ax = actPort.localNormal.x;
          const Az = actPort.localNormal.z;
          const Tx = effectiveTargetPort.worldNormal.x;
          const Tz = effectiveTargetPort.worldNormal.z;

          const sinAlpha = Ax * Tz - Az * Tx;
          const cosAlpha = -Ax * Tx - Az * Tz;
          const requiredYaw = Math.atan2(sinAlpha, cosAlpha);
          const yawCandidates =
            isMixedGiroChairSnap && !isStrictMoreaGiroChairSnap
              ? [requiredYaw, requiredYaw + Math.PI]
              : [requiredYaw];

          for (const yawCandidate of yawCandidates) {
            // Traslación del objeto activo según el yaw candidato.
            const rotatedOffset = actPort.localPos
              .clone()
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), yawCandidate);

            let targetPosY;
            if (isAccessorySnap) {
              targetPosY = activeConnectors.isAccessory ? targetObj.position.y : activeAssembly.position.y;
            } else if (isPanelDivisorSnap) {
              // Mantener la altura actual evita que la silla "se hunda" al acoplarse al panel divisor.
              targetPosY = activeAssembly.position.y;
            } else if (isGiroSnap) {
              if (activeConnectors.isGiro) {
                targetPosY = (effectiveTargetPort.worldPos.y - rotatedOffset.y) + giroDropM;
              } else {
                // Cuando la silla se acopla a una superficie de giro, no debe copiar la bajada
                // propia del giro; la caída vertical solo se aplica si el giro es el activo.
                targetPosY = activeAssembly.position.y;
              }
            } else {
              targetPosY = effectiveTargetPort.worldPos.y - rotatedOffset.y;
            }

            const targetPos = new THREE.Vector3(
              effectiveTargetPort.worldPos.x - rotatedOffset.x,
              Number.isFinite(targetPosY) ? targetPosY : activeAssembly.position.y,
              effectiveTargetPort.worldPos.z - rotatedOffset.z
            );

            if (isPanelDivisorSnap && effectiveTargetPort?.side) {
              const qty = resolveActiveMilaQuantity(activeAssembly);
              const baseShift = Number(PANEL_DIVISOR_CONNECTOR_TUNE.seatBackShiftM || 0);
              const multiExtra = qty > 1
                ? Number(PANEL_DIVISOR_CONNECTOR_TUNE.multiSeatBackExtraShiftM || 0)
                : 0;
              const panelSideAxis = new THREE.Vector3(0, 0, 1)
                .applyQuaternion(targetObj.getWorldQuaternion(new THREE.Quaternion()))
                .normalize();
              const sideSign = effectiveTargetPort.side === 'left' ? 1 : -1;
              // Mueve la silla hacia atrás siguiendo el eje real del panel, no el Z mundial.
              targetPos.addScaledVector(panelSideAxis, sideSign * (baseShift + multiExtra));

              const wallOverlapM = Number(PANEL_DIVISOR_CONNECTOR_TUNE.panelWallOverlapM || 0);
              if (wallOverlapM) {
                // Empuja la silla 2 cm hacia la pared para tapar el hueco visual.
                targetPos.addScaledVector(effectiveTargetPort.worldNormal, -wallOverlapM);
              }
            }

            let isOutsideCandidate = true;
            let penetrationPenalty = 0;
            if (
              isMixedGiroChairSnap &&
              activeLocalCorners?.length &&
              effectiveTargetPort?.worldNormal &&
              effectiveTargetPort?.worldPos
            ) {
              const outsideToleranceM = 0.005;
              let minSignedDistance = Number.POSITIVE_INFINITY;
              const localY = new THREE.Vector3(0, 1, 0);

              for (const localCorner of activeLocalCorners) {
                const worldCorner = localCorner
                  .clone()
                  .applyAxisAngle(localY, yawCandidate)
                  .add(targetPos);
                const signedDistance = worldCorner
                  .clone()
                  .sub(effectiveTargetPort.worldPos)
                  .dot(effectiveTargetPort.worldNormal);
                if (signedDistance < minSignedDistance) {
                  minSignedDistance = signedDistance;
                }
              }

              if (minSignedDistance < -outsideToleranceM) {
                isOutsideCandidate = false;
                const penetrationDepth = Math.abs(minSignedDistance + outsideToleranceM);
                penetrationPenalty = Math.min(0.45, penetrationDepth * 6);
              }
            }

            if (
              isOutsideCandidate &&
              activeConnectors.isGiro &&
              targetConnectors.isMorea &&
              !targetConnectors.isGiro &&
              activeLocalCenter &&
              (effectiveTargetPort.id === 'left' || effectiveTargetPort.id === 'right')
            ) {
              const chairLocalBounds = resolveObjectLocalBounds(targetObj);
              if (chairLocalBounds) {
                const giroCenterWorld = activeLocalCenter
                  .clone()
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), yawCandidate)
                  .add(targetPos);
                const giroCenterInChairLocal = targetObj.worldToLocal(giroCenterWorld.clone());
                const outsideMarginM = 0.02;
                const outsideDistance =
                  effectiveTargetPort.id === 'left'
                    ? chairLocalBounds.min.x - giroCenterInChairLocal.x
                    : giroCenterInChairLocal.x - chairLocalBounds.max.x;

                if (outsideDistance < outsideMarginM) {
                  isOutsideCandidate = false;
                  const centerPenetration = outsideMarginM - outsideDistance;
                  penetrationPenalty += Math.min(0.45, centerPenetration * 6);
                }
              }
            }

            if (isStrictMoreaGiroChairSnap && !isOutsideCandidate) {
              continue;
            }

            const snapScore = dist + penetrationPenalty;
            const snapCandidate = {
              type: 'MILA_SNAP',
              targetObj,
              activeSide: actPort.id,
              targetSide: effectiveTargetPort.id,
              distance: dist,
              targetTransform: {
                x: targetPos.x,
                y: targetPos.y,
                z: targetPos.z,
                rotY: yawCandidate,
              },
              connectionPoint: effectiveTargetPort.worldPos.clone(),
              targetNormal: effectiveTargetPort.worldNormal.clone(),
              activeNormal: actPort.worldNormal.clone(),
            };

            if (isOutsideCandidate && snapScore < bestOutsideScore) {
              bestOutsideScore = snapScore;
              bestOutsideSnap = snapCandidate;
            }

            if (snapScore < bestScore) {
              bestScore = snapScore;
              bestSnap = snapCandidate;
            }
          }
        }
      }
    }
  }

  return bestOutsideSnap || bestSnap;
}

/**
 * Unifica dos ensambles conectados bajo el mismo groupId para comportarse como un solo objeto rígido continuo.
 */
export function unifyMilaConnectedAssemblies(objA, objB) {
  if (!objA || !objB) return null;

  const rootA = getMilaAssemblyRoot(objA) || objA;
  const rootB = getMilaAssemblyRoot(objB) || objB;

  const groupA = rootA.userData?.groupId;
  const groupB = rootB.userData?.groupId;
  const commonGroupId =
    groupA || groupB || `MILA_GROUP_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  let sceneRoot = rootA;
  while (sceneRoot.parent) sceneRoot = sceneRoot.parent;

  sceneRoot.traverse((node) => {
    if (!node || !node.userData) return;
    const g = node.userData.groupId;
    if (g && (g === groupA || g === groupB)) {
      node.userData.groupId = commonGroupId;
    }
  });

  const applyGroupId = (root) => {
    if (!root) return;
    if (root.userData) {
      root.userData.groupId = commonGroupId;
    }
    root.traverse((child) => {
      if (child?.userData) {
        child.userData.groupId = commonGroupId;
      }
    });
  };

  applyGroupId(rootA);
  applyGroupId(rootB);

  return commonGroupId;
}
