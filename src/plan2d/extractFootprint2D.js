import * as THREE from 'three';
import { createPolygonFootprint, createRectangleFootprint } from './footprint2D.js';

let footprintCache = new WeakMap();

function roundSignatureNumber(value) {
  return Number(value || 0).toFixed(9);
}

function serializeMatrix(matrix) {
  return matrix.elements.map(roundSignatureNumber).join(',');
}

function resolveFallbackSignature(bounds2d) {
  if (!bounds2d) return '';
  const center = bounds2d.localCenter || bounds2d.center || [];
  const size = bounds2d.sizeLocal || bounds2d.bounds || bounds2d;
  const cx = Array.isArray(center) ? center[0] : center?.x;
  const cz = Array.isArray(center) ? center[2] : center?.z;
  const sw = Array.isArray(size) ? size[0] : size?.x || size?.w;
  const sd = Array.isArray(size) ? size[2] : size?.z || size?.d;
  return [
    Number(cx || 0).toFixed(4),
    Number(cz || 0).toFixed(4),
    Number(sw || 0).toFixed(4),
    Number(sd || 0).toFixed(4),
  ].join(',');
}

function visitMeshes(root, visitor) {
  root?.traverse?.((child) => {
    if (!child?.isMesh || !child.geometry?.attributes?.position) return;
    visitor(child, child.geometry.attributes.position);
  });
}

export function createFootprint2DSignature(root, { tolerance, fallbackBounds } = {}) {
  if (!root?.isObject3D) return '';
  root.updateWorldMatrix?.(true, true);
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const relativeMatrix = new THREE.Matrix4();
  const entries = [];

  visitMeshes(root, (mesh, position) => {
    relativeMatrix.multiplyMatrices(inverseRoot, mesh.matrixWorld);
    entries.push(
      [
        mesh.uuid,
        mesh.geometry.uuid,
        position.count,
        position.version || 0,
        serializeMatrix(relativeMatrix),
      ].join(':')
    );
  });

  return [
    Number.isFinite(Number(tolerance)) ? Number(tolerance) : 'auto',
    resolveFallbackSignature(fallbackBounds),
    ...entries,
  ].join('|');
}

export function extractFootprintPoints2D(root) {
  if (!root?.isObject3D) return [];
  root.updateWorldMatrix?.(true, true);

  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const relativeMatrix = new THREE.Matrix4();
  const vertex = new THREE.Vector3();
  const points = [];
  const seen = new Set();

  visitMeshes(root, (mesh, position) => {
    relativeMatrix.multiplyMatrices(inverseRoot, mesh.matrixWorld);
    const count = position.count;
    const isDense = count > 500;
    for (let index = 0; index < count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(relativeMatrix);
      if (Number.isFinite(vertex.x) && Number.isFinite(vertex.z)) {
        if (isDense) {
          const qx = Math.round(vertex.x * 4000);
          const qz = Math.round(vertex.z * 4000);
          const key = `${qx}:${qz}`;
          if (seen.has(key)) continue;
          seen.add(key);
        }
        points.push({ x: vertex.x, z: vertex.z });
      }
    }
  });

  return points;
}

export function getFootprint2D(root, { tolerance, fallbackBounds = null, force = false } = {}) {
  if (!root?.isObject3D) {
    return fallbackBounds ? createRectangleFootprint(fallbackBounds) : null;
  }

  const signature = createFootprint2DSignature(root, { tolerance, fallbackBounds });
  const cached = footprintCache.get(root);
  if (!force && cached?.signature === signature) return cached.footprint;

  const points = extractFootprintPoints2D(root);
  const footprint =
    createPolygonFootprint(points, { tolerance }) ||
    (fallbackBounds ? createRectangleFootprint(fallbackBounds) : null);

  footprintCache.set(root, { signature, footprint });
  return footprint;
}

export function invalidateFootprint2D(root) {
  if (!root?.isObject3D) return false;
  if (root.userData) {
    delete root.userData.footprint2D;
    delete root.userData.bounds2d;
  }
  return footprintCache.delete(root);
}

export function clearFootprint2DCache() {
  footprintCache = new WeakMap();
}

export function getFootprint2DCacheEntry(root) {
  return footprintCache.get(root) || null;
}

