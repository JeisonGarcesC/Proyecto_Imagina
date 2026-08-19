import * as THREE from 'three';
import { acquireCritterium8PreviewMaterial, releaseCritterium8PreviewMaterial } from './previewMaterialResolver.js';

export function cmToMeters(value) {
  return Number(value) / 100;
}

export const CRITTERIUM8_PROVISIONAL_VISUAL_DIMENSIONS_CM = Object.freeze({
  FRAME_POST_WIDTH: 2.5,
  TOP_BEVEL_HEIGHT: 1.5,
  CEILING_U_HEIGHT: 2,
  LEVELER_RADIUS: 1.2,
  LEVELER_HEIGHT: 2.5,
  PLACEHOLDER_SIZE: 10,
});

const geometryCache = new Map();

function geometryKey(kind, values) {
  return `${kind}:${values.map((value) => Number(value).toFixed(4)).join(':')}`;
}

function acquireGeometry(key, create) {
  let entry = geometryCache.get(key);
  if (!entry) {
    entry = { geometry: create(), references: 0 };
    geometryCache.set(key, entry);
  }
  entry.references += 1;
  return entry.geometry;
}

export function releaseCritterium8PreviewGeometry(key) {
  const entry = geometryCache.get(key);
  if (!entry) return;
  entry.references -= 1;
  if (entry.references <= 0) {
    entry.geometry.dispose();
    geometryCache.delete(key);
  }
}

function boxGeometry(widthCm, heightCm, depthCm) {
  const dimensions = [widthCm, heightCm, depthCm].map((value) => Math.max(cmToMeters(value), 0.0001));
  const key = geometryKey('BOX', dimensions);
  return { key, geometry: acquireGeometry(key, () => new THREE.BoxGeometry(...dimensions)) };
}

function cylinderGeometry(radiusCm, heightCm) {
  const radius = Math.max(cmToMeters(radiusCm), 0.0001);
  const height = Math.max(cmToMeters(heightCm), 0.0001);
  const key = geometryKey('CYLINDER', [radius, height, 16]);
  return { key, geometry: acquireGeometry(key, () => new THREE.CylinderGeometry(radius, radius, height, 16)) };
}

function resolveDimensions(part, asset) {
  const provisional = CRITTERIUM8_PROVISIONAL_VISUAL_DIMENSIONS_CM;
  if (asset.rendererKey === 'FRAME_POST') return [provisional.FRAME_POST_WIDTH, part.heightCm, part.depthCm || 8];
  if (asset.rendererKey === 'TOP_BEVEL') return [part.widthCm, provisional.TOP_BEVEL_HEIGHT, part.depthCm || 8];
  if (asset.rendererKey === 'CEILING_U') return [part.widthCm, provisional.CEILING_U_HEIGHT, part.depthCm || 8];
  if (asset.rendererKey === 'TILE') return [part.widthCm, part.heightCm, part.depthCm || 1.5];
  if (asset.rendererKey === 'PLACEHOLDER') return [provisional.PLACEHOLDER_SIZE, provisional.PLACEHOLDER_SIZE, provisional.PLACEHOLDER_SIZE];
  return [part.widthCm, part.heightCm, part.depthCm];
}

function quantityOffsetX(index, quantity, assemblyWidthCm) {
  if (quantity <= 1) return 0;
  const usableHalfWidth = Math.max(Number(assemblyWidthCm) / 2 - 2, 0);
  return quantity === 2
    ? (index === 0 ? -usableHalfWidth : usableHalfWidth)
    : -usableHalfWidth + (2 * usableHalfWidth * index) / (quantity - 1);
}

function createMesh(part, asset, index, context) {
  const materialRef = acquireCritterium8PreviewMaterial(part, asset);
  let geometryRef;
  if (asset.rendererKey === 'LEVELER') {
    geometryRef = cylinderGeometry(CRITTERIUM8_PROVISIONAL_VISUAL_DIMENSIONS_CM.LEVELER_RADIUS, CRITTERIUM8_PROVISIONAL_VISUAL_DIMENSIONS_CM.LEVELER_HEIGHT);
  } else {
    geometryRef = boxGeometry(...resolveDimensions(part, asset));
  }
  const mesh = new THREE.Mesh(geometryRef.geometry, materialRef.material);
  mesh.name = `${part.type}_${index}`;
  mesh.userData.critterium8GeometryKey = geometryRef.key;
  mesh.userData.critterium8MaterialKey = materialRef.key;
  if (part.type === 'LEVELER') {
    mesh.position.x = cmToMeters(quantityOffsetX(index, context.quantity, context.assemblyWidthCm));
    mesh.position.y = cmToMeters(CRITTERIUM8_PROVISIONAL_VISUAL_DIMENSIONS_CM.LEVELER_HEIGHT / 2);
  }
  return mesh;
}

export function renderCritterium8ProceduralPart({ part, placement, asset, assemblyWidthCm } = {}) {
  const root = new THREE.Group();
  const quantity = Math.max(1, Math.trunc(Number(part.quantity || 1)));
  for (let index = 0; index < quantity; index += 1) {
    root.add(createMesh(part, asset, index, { quantity, assemblyWidthCm }));
  }
  root.userData.provisionalGeometry = asset.metadata?.provisionalGeometry === true;
  root.userData.quantityStrategy = quantity > 1 ? 'DETERMINISTIC_HORIZONTAL_DISTRIBUTION' : 'SINGLE';
  root.userData.placementId = placement.id;
  return root;
}

export function disposeCritterium8RenderedObject(root) {
  root?.traverse?.((object) => {
    if (object.userData?.critterium8GeometryKey) releaseCritterium8PreviewGeometry(object.userData.critterium8GeometryKey);
    if (object.userData?.critterium8MaterialKey) releaseCritterium8PreviewMaterial(object.userData.critterium8MaterialKey);
  });
  root?.clear?.();
}
