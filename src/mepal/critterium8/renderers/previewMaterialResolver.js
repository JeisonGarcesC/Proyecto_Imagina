import * as THREE from 'three';

const materialCache = new Map();

function materialKeyForPart(part = {}, asset = {}) {
  if (asset.type === 'PLACEHOLDER') return 'PLACEHOLDER';
  if (part.type !== 'TILE') return 'STRUCTURAL';
  const tileType = String(part.metadata?.tileType || '').toUpperCase();
  if (tileType.includes('GLASS')) return 'GLASS';
  if (tileType.includes('FABRIC') || tileType.includes('ACOUSTIC')) return 'FABRIC';
  if (tileType.includes('METAL') || tileType.includes('PORT')) return 'METAL';
  return 'FORMICA';
}

function createMaterial(key) {
  if (key === 'GLASS') return new THREE.MeshStandardMaterial({ color: 0x9fd8eb, transparent: true, opacity: 0.38, roughness: 0.15, metalness: 0 });
  if (key === 'FABRIC') return new THREE.MeshStandardMaterial({ color: 0x486b8a, roughness: 0.9, metalness: 0 });
  if (key === 'METAL') return new THREE.MeshStandardMaterial({ color: 0x929aa0, roughness: 0.42, metalness: 0.55 });
  if (key === 'FORMICA') return new THREE.MeshStandardMaterial({ color: 0xb99269, roughness: 0.7, metalness: 0 });
  if (key === 'PLACEHOLDER') return new THREE.MeshBasicMaterial({ color: 0xff35c8, wireframe: true });
  return new THREE.MeshStandardMaterial({ color: 0x4d555b, roughness: 0.62, metalness: 0.35 });
}

export function acquireCritterium8PreviewMaterial(part, asset) {
  const key = materialKeyForPart(part, asset);
  let entry = materialCache.get(key);
  if (!entry) {
    entry = { material: createMaterial(key), references: 0 };
    materialCache.set(key, entry);
  }
  entry.references += 1;
  return { key, material: entry.material };
}

export function releaseCritterium8PreviewMaterial(key) {
  const entry = materialCache.get(key);
  if (!entry) return;
  entry.references -= 1;
  if (entry.references <= 0) {
    entry.material.dispose();
    materialCache.delete(key);
  }
}

export function getCritterium8PreviewMaterialCacheSize() {
  return materialCache.size;
}
