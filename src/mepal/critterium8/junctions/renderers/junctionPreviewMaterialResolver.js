import * as THREE from 'three';

const cache = new Map();

function createMaterial(key) {
  if (key === 'PLACEHOLDER') return new THREE.MeshBasicMaterial({ color: 0xff35c8, wireframe: true });
  if (key === 'TYPE_B') return new THREE.MeshStandardMaterial({ color: 0x335f85, roughness: 0.55, metalness: 0.35 });
  if (key === 'TIP') return new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.6, metalness: 0.2 });
  return new THREE.MeshStandardMaterial({ color: 0x59636b, roughness: 0.62, metalness: 0.35 });
}

export function acquireCritterium8JunctionMaterial(key = 'STRUCTURAL') {
  if (!cache.has(key)) cache.set(key, { material: createMaterial(key), references: 0 });
  const entry = cache.get(key);
  entry.references += 1;
  return { key, material: entry.material };
}

export function releaseCritterium8JunctionMaterial(key) {
  const entry = cache.get(key);
  if (!entry) return;
  entry.references -= 1;
  if (entry.references <= 0) {
    entry.material.dispose();
    cache.delete(key);
  }
}

export function getCritterium8JunctionMaterialCacheSize() {
  return cache.size;
}
