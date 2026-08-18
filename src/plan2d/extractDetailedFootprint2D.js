import * as THREE from 'three';
import { createPolygonFootprint } from './footprint2D.js';

export const DETAILED_FOOTPRINT_LIMITS = Object.freeze({
  maxShapes: 64,
  maxPointsPerShape: 64,
  maxTotalPoints: 2048,
  minAreaRatio: 0.00005,
});

const SHARED_CACHE_LIMIT = 256;

let rootCache = new WeakMap();
let sharedCache = new Map();

function now() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function roundSignatureNumber(value) {
  return Number(value || 0).toFixed(8);
}

function serializeMatrix(matrix) {
  return matrix.elements.map(roundSignatureNumber).join(',');
}

function getProductKey(root) {
  const data = root?.userData || {};
  return [
    data.codigoPT || data.code || '',
    data.variant || data.almacenVariant || data.mepalVariant || '',
    data.kind || data.type || '',
    data.geometryVersion || data.structureVersion || '',
    JSON.stringify(data.dim || data.dimM || data.procedural || ''),
  ].join(':');
}

function isEffectivelyVisible(object, root) {
  let current = object;
  while (current) {
    if (current.visible === false) return false;
    if (current === root) return true;
    current = current.parent;
  }
  return true;
}

function getRole(mesh) {
  return (
    mesh.userData?.role ||
    mesh.userData?.leaderRole ||
    mesh.userData?.subtype ||
    mesh.userData?.kind ||
    mesh.name ||
    'MESH'
  );
}

function buildStructureSignature(root, entries) {
  return [getProductKey(root), ...entries].join('|');
}

function rememberShared(signature, value) {
  if (sharedCache.size >= SHARED_CACHE_LIMIT) {
    const oldestKey = sharedCache.keys().next().value;
    if (oldestKey) sharedCache.delete(oldestKey);
  }
  sharedCache.set(signature, value);
}

function freezeDetailedFootprint(value) {
  value.detailedShapes.forEach((shape) => {
    shape.points.forEach(Object.freeze);
    Object.freeze(shape.points);
    Object.freeze(shape.bounds);
    Object.freeze(shape);
  });
  Object.freeze(value.detailedShapes);
  Object.freeze(value.metrics);
  return Object.freeze(value);
}

export function extractDetailedFootprint2D(
  root,
  {
    normalShape = null,
    force = false,
    maxShapes = DETAILED_FOOTPRINT_LIMITS.maxShapes,
    maxPointsPerShape = DETAILED_FOOTPRINT_LIMITS.maxPointsPerShape,
    maxTotalPoints = DETAILED_FOOTPRINT_LIMITS.maxTotalPoints,
    minAreaRatio = DETAILED_FOOTPRINT_LIMITS.minAreaRatio,
  } = {}
) {
  if (!root?.isObject3D) return null;
  const productKey = getProductKey(root);
  const rootEntry = rootCache.get(root);
  if (!force && rootEntry?.productKey === productKey) return rootEntry.value;

  const startedAt = now();
  root.updateWorldMatrix?.(true, true);
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const relativeMatrix = new THREE.Matrix4();
  const vertex = new THREE.Vector3();
  const candidates = [];
  const signatureEntries = [];
  let meshCount = 0;

  root.traverse?.((mesh) => {
    const position = mesh?.geometry?.attributes?.position;
    if (!mesh?.isMesh || !position || !isEffectivelyVisible(mesh, root)) return;
    meshCount += 1;
    relativeMatrix.multiplyMatrices(inverseRoot, mesh.matrixWorld);
    signatureEntries.push(
      [
        mesh.name || mesh.type || 'Mesh',
        mesh.geometry.uuid,
        position.count,
        position.version || 0,
        serializeMatrix(relativeMatrix),
      ].join(':')
    );

    const points = [];
    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(relativeMatrix);
      if (Number.isFinite(vertex.x) && Number.isFinite(vertex.z)) {
        points.push({ x: vertex.x, z: vertex.z });
      }
    }
    const footprint = createPolygonFootprint(points);
    if (!footprint || footprint.points.length < 3) return;
    candidates.push({
      role: String(getRole(mesh)),
      sourceMesh: mesh.name || mesh.geometry.name || 'Mesh',
      points: footprint.points.map(({ x, z }) => ({ x, z })),
      closed: true,
      bounds: { ...footprint.bounds },
    });
  });

  const signature = buildStructureSignature(root, signatureEntries);
  if (!force && sharedCache.has(signature)) {
    const shared = sharedCache.get(signature);
    rootCache.set(root, { productKey, value: shared });
    return shared;
  }

  const normalArea = Math.max(
    Number.EPSILON,
    Math.abs(Number(normalShape?.bounds?.w) * Number(normalShape?.bounds?.d)) || 0
  );
  const detailedShapes = candidates.filter((shape) => {
    const area = Math.abs(Number(shape.bounds.w) * Number(shape.bounds.d));
    return area > Number.EPSILON && (normalArea <= Number.EPSILON || area / normalArea >= minAreaRatio);
  });
  const totalPoints = detailedShapes.reduce((sum, shape) => sum + shape.points.length, 0);
  const exceededLimits =
    detailedShapes.length === 0 ||
    detailedShapes.length > maxShapes ||
    totalPoints > maxTotalPoints ||
    detailedShapes.some((shape) => shape.points.length > maxPointsPerShape);

  if (exceededLimits) {
    rootCache.set(root, { productKey, value: null });
    return null;
  }

  const result = freezeDetailedFootprint({
    version: 1,
    normalShape,
    detailedShapes,
    metrics: {
      generationMs: Math.max(0, now() - startedAt),
      meshCount,
      shapeCount: detailedShapes.length,
      pointCount: totalPoints,
    },
  });

  rootCache.set(root, { productKey, value: result });
  rememberShared(signature, result);
  return result;
}

export function invalidateDetailedFootprint2D(root) {
  return Boolean(root?.isObject3D && rootCache.delete(root));
}

export function clearDetailedFootprint2DCache() {
  rootCache = new WeakMap();
  sharedCache = new Map();
}

export function getDetailedFootprint2DCacheEntry(root) {
  const entry = rootCache.get(root);
  return entry?.productKey === getProductKey(root) ? entry.value : null;
}

export function hasDetailedFootprint2DCacheEntry(root) {
  const entry = root?.isObject3D ? rootCache.get(root) : null;
  return Boolean(entry && entry.productKey === getProductKey(root));
}
