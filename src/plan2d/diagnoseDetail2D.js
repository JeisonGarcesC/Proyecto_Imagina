import * as THREE from 'three';
import { createPolygonFootprint } from './footprint2D.js';
import {
  DETAILED_FOOTPRINT_LIMITS,
  hasDetailedFootprint2DCacheEntry,
} from './extractDetailedFootprint2D.js';

function ancestorData(node, root, key) {
  for (let current = node; current; current = current.parent) {
    if (current.userData?.[key] != null) return current.userData[key];
    if (current === root) break;
  }
  return null;
}

function visibleWithin(node, root) {
  for (let current = node; current; current = current.parent) {
    if (!current.visible) return false;
    if (current === root) break;
  }
  return true;
}

function shapeKey(shape) {
  return `${shape.sourceMesh}|${shape.points.map((point) =>
    `${point.x.toFixed(6)},${point.z.toFixed(6)}`).join(';')}`;
}

/** Read-only inspection of the geometry used by the current 2D footprint extractor. */
export function diagnoseDetail2DInstance(root, snapshot = null, snapshotIndex = -1) {
  if (!root?.isObject3D) return null;
  root.updateWorldMatrix(true, true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const relative = new THREE.Matrix4();
  const vertex = new THREE.Vector3();
  const kind = root.userData?.kind || root.userData?.type || null;
  const excluded = kind === 'LINK_PRODUCT' || kind === 'VETRO_PRODUCT' ||
    kind === 'CRITTERIUM_8_ASSEMBLY';
  const doubleKuo = kind === 'KUO_AV_DOBLE_ASSEMBLY';
  const maxShapes = doubleKuo ? 192 : DETAILED_FOOTPRINT_LIMITS.maxShapes;
  const maxTotalPoints = doubleKuo ? 4096 : DETAILED_FOOTPRINT_LIMITS.maxTotalPoints;
  const normalBounds = snapshot?.footprint?.bounds || root.userData?.footprint2D?.bounds;
  const worldBounds = new THREE.Box3().setFromObject(root);
  const normalArea = Math.max(Number.EPSILON, normalBounds
    ? Math.abs(Number(normalBounds.w) * Number(normalBounds.d))
    : worldBounds.isEmpty() ? 0 : worldBounds.getSize(new THREE.Vector3()).x *
      worldBounds.getSize(new THREE.Vector3()).z);
  const rows = [];
  const candidates = [];

  root.traverse((node) => {
    if (!node.isMesh && !node.isLineSegments) return;
    const position = node.geometry?.attributes?.position;
    const role = node.userData?.role || node.userData?.leaderRole ||
      node.userData?.subtype || node.userData?.kind || node.name || 'MESH';
    const row = {
      family: root.userData?.family || root.userData?.line || kind,
      product: kind,
      instanceId: root.userData?.instanceId || root.uuid,
      meshName: node.name || null,
      sourceMesh: node.name || node.geometry?.name || 'Mesh',
      role: String(role),
      componentRole: ancestorData(node, root, 'componentRole'),
      componentKey: ancestorData(node, root, 'componentKey'),
      partType: ancestorData(node, root, 'partType'),
      partId: ancestorData(node, root, 'partId'),
      subtype: ancestorData(node, root, 'subtype'),
      kind: ancestorData(node, root, 'kind'),
      visible: visibleWithin(node, root),
      hasGeometry: Boolean(node.geometry),
      hasPosition: Boolean(position),
      vertexCount: position?.count || 0,
      projectedArea: null,
      areaRatio: null,
      geometryProjectable: false,
      lineProjectionHasFiniteXZ: null,
      lineProjectedBoundsArea: null,
      placeholder: Boolean(ancestorData(node, root, 'provisional') ||
        ancestorData(node, root, 'provisionalGeometry')),
      shape2D: root.userData?.shape2D || null,
      acceptedByExtractor: false,
      inDetailedShapes: false,
      detailedShapeIndex: -1,
      snapshotIndex,
      reasons: [],
    };
    rows.push(row);
    if (!row.componentRole && !row.componentKey && !row.partType && !row.partId &&
        !node.userData?.role && !node.name) row.reasons.push('metadata_unavailable');
    if (!node.isMesh) row.reasons.push('line_segments_not_supported');
    if (!row.visible) row.reasons.push('invisible');
    if (!row.hasGeometry) row.reasons.push('no_geometry');
    else if (!row.hasPosition) row.reasons.push('no_position');
    if (row.placeholder) row.reasons.push('placeholder_or_provisional');
    if (node.isLineSegments && position && row.visible) {
      relative.multiplyMatrices(inverseRoot, node.matrixWorld);
      const projected = [];
      for (let index = 0; index < position.count; index += 1) {
        vertex.fromBufferAttribute(position, index).applyMatrix4(relative);
        if (Number.isFinite(vertex.x) && Number.isFinite(vertex.z)) projected.push(vertex.clone());
      }
      row.lineProjectionHasFiniteXZ = projected.length === position.count;
      if (projected.length) {
        const bounds = new THREE.Box3().setFromPoints(projected);
        const size = bounds.getSize(new THREE.Vector3());
        row.lineProjectedBoundsArea = size.x * size.z;
      }
    }
    if (!node.isMesh || !row.visible || !position) return;

    relative.multiplyMatrices(inverseRoot, node.matrixWorld);
    const points = [];
    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(relative);
      if (Number.isFinite(vertex.x) && Number.isFinite(vertex.z)) {
        points.push({ x: vertex.x, z: vertex.z });
      }
    }
    const footprint = createPolygonFootprint(points);
    if (!footprint || footprint.points.length < 3) {
      row.reasons.push('not_projectable');
      return;
    }
    row.projectedArea = Math.abs(footprint.bounds.w * footprint.bounds.d);
    row.areaRatio = row.projectedArea / normalArea;
    row.geometryProjectable = row.projectedArea > Number.EPSILON;
    if (!row.geometryProjectable || row.areaRatio < DETAILED_FOOTPRINT_LIMITS.minAreaRatio) {
      row.reasons.push('insufficient_area');
      return;
    }
    if (footprint.points.length > DETAILED_FOOTPRINT_LIMITS.maxPointsPerShape) {
      row.reasons.push('excess_points_per_shape');
    }
    candidates.push({ row, shape: { sourceMesh: row.sourceMesh, points: footprint.points } });
  });

  const totalPoints = candidates.reduce((sum, item) => sum + item.shape.points.length, 0);
  const limitReasons = [];
  if (candidates.length === 0) limitReasons.push('no_accepted_shapes');
  if (candidates.length > maxShapes) limitReasons.push('excess_shapes');
  if (totalPoints > maxTotalPoints) limitReasons.push('excess_total_points');
  if (candidates.some(({ row }) => row.reasons.includes('excess_points_per_shape'))) {
    limitReasons.push('excess_points_per_shape');
  }
  const snapshotShapes = snapshot?.detailedFootprint?.detailedShapes || [];
  const used = new Set();
  for (const { row, shape } of candidates) {
    if (excluded) row.reasons.push('family_excluded');
    if (limitReasons.length) row.reasons.push(...limitReasons);
    row.acceptedByExtractor = limitReasons.length === 0;
    const key = shapeKey(shape);
    const index = snapshotShapes.findIndex((item, i) => !used.has(i) && shapeKey(item) === key);
    if (index >= 0) {
      used.add(index);
      row.inDetailedShapes = true;
      row.detailedShapeIndex = index;
    } else if (!excluded && !limitReasons.length) {
      row.reasons.push(snapshot?.detailedFootprint
        ? 'not_in_snapshot_detail'
        : hasDetailedFootprint2DCacheEntry(root)
          ? 'detail_extraction_failed'
          : 'detail_not_generated');
    }
  }
  return {
    family: root.userData?.family || root.userData?.line || kind,
    product: kind,
    instanceId: root.userData?.instanceId || root.uuid,
    snapshotIndex,
    exclusion: excluded ? 'family_excluded' : null,
    normalAreaSource: normalBounds ? 'footprint' : 'world_bounds_estimate',
    shape2D: root.userData?.shape2D || null,
    candidateShapeCount: candidates.length,
    candidatePointCount: totalPoints,
    limitReasons,
    snapshotDetailStatus: excluded ? 'excluded' : snapshot?.detailedFootprint
      ? 'detailed' : hasDetailedFootprint2DCacheEntry(root)
        ? 'extraction_failed' : 'not_generated',
    rows,
  };
}
