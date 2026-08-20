import * as THREE from 'three';
import {
  acquireCritterium8JunctionMaterial,
  releaseCritterium8JunctionMaterial,
} from './junctionPreviewMaterialResolver.js';

const geometryCache = new Map();

function acquireBoxGeometry(width, height, depth) {
  const values = [width, height, depth].map((value) => Math.max(Number(value) || 0, 0.001));
  const key = `BOX:${values.map((value) => value.toFixed(4)).join(':')}`;
  if (!geometryCache.has(key)) geometryCache.set(key, { geometry: new THREE.BoxGeometry(...values), references: 0 });
  const entry = geometryCache.get(key);
  entry.references += 1;
  return { key, geometry: entry.geometry };
}

function releaseGeometry(key) {
  const entry = geometryCache.get(key);
  if (!entry) return;
  entry.references -= 1;
  if (entry.references <= 0) {
    entry.geometry.dispose();
    geometryCache.delete(key);
  }
}

function createBox({ size, position, rotationY = 0, materialKey = 'STRUCTURAL' }) {
  const geometry = acquireBoxGeometry(size.x, size.y, size.z);
  const material = acquireCritterium8JunctionMaterial(materialKey);
  const mesh = new THREE.Mesh(geometry.geometry, material.material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.rotation.y = rotationY;
  mesh.userData.critterium8JunctionGeometryKey = geometry.key;
  mesh.userData.critterium8JunctionMaterialKey = material.key;
  return mesh;
}

function branchAngles(type) {
  if (type === 'TERMINAL') return [0];
  if (type === 'DEG_90') return [0, Math.PI / 2];
  if (type === 'T') return [0, Math.PI / 2, Math.PI];
  if (type === 'X') return [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  return [0, Math.PI];
}

export function renderCritterium8ProceduralJunction({ layout = {}, asset = {} } = {}) {
  const root = new THREE.Group();
  if (asset.rendererKey === 'REPLACED_BY_DUCT') return root;
  const bounds = layout.bounds || {};
  const width = Math.max(Number(bounds.maxX) - Number(bounds.minX), 0.08);
  const depth = Math.max(Number(bounds.maxZ) - Number(bounds.minZ), 0.08);
  const height = Math.max(Number(bounds.maxY) - Number(bounds.minY), 0.08);
  const centerY = Number(bounds.minY || 0) + height / 2;
  const placeholder = asset.type === 'PLACEHOLDER';
  if (placeholder) {
    root.add(createBox({ size: { x: width, y: Math.min(height, 0.18), z: depth }, position: { x: 0, y: Math.min(centerY, 0.12), z: 0 }, materialKey: 'PLACEHOLDER' }));
    return root;
  }

  const materialKey = asset.metadata?.variant === 'TYPE_B' ? 'TYPE_B' : 'STRUCTURAL';
  const postSize = Math.min(width, depth, 0.055);
  root.add(createBox({ size: { x: postSize, y: height, z: postSize }, position: { x: 0, y: centerY, z: 0 }, materialKey }));
  const armLength = Math.max(width, depth) / 2;
  const armThickness = Math.min(0.035, postSize);
  for (const angle of branchAngles(asset.metadata?.junctionType)) {
    const distance = armLength / 2;
    root.add(createBox({
      size: { x: armLength, y: armThickness, z: armThickness },
      position: { x: Math.cos(angle) * distance, y: Math.min(height * 0.55, centerY), z: -Math.sin(angle) * distance },
      rotationY: angle,
      materialKey,
    }));
  }
  if (layout.metadata?.includesTip === true) {
    root.add(createBox({ size: { x: postSize * 1.4, y: 0.025, z: postSize * 1.4 }, position: { x: 0, y: height + 0.0125, z: 0 }, materialKey: 'TIP' }));
  }
  return root;
}

export function disposeCritterium8ProceduralJunction(root) {
  root?.traverse?.((object) => {
    if (object.userData?.critterium8JunctionGeometryKey) releaseGeometry(object.userData.critterium8JunctionGeometryKey);
    if (object.userData?.critterium8JunctionMaterialKey) releaseCritterium8JunctionMaterial(object.userData.critterium8JunctionMaterialKey);
  });
  root?.clear?.();
}

export function getCritterium8JunctionGeometryCacheSize() {
  return geometryCache.size;
}
