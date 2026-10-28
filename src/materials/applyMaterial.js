import * as THREE from 'three';
import { getThreeMaterialFromDef } from './materialRegistry.js';

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();
const visualFinishIdentity = new WeakMap();

export function getVisualFinishIdentity(object) {
  return object ? visualFinishIdentity.get(object) || null : null;
}

export function setVisualFinishIdentity(object, identity) {
  if (!object) return;
  if (identity) visualFinishIdentity.set(object, identity);
  else visualFinishIdentity.delete(object);
}

function loadTextureCached(url) {
  if (!url) return null;
  if (textureCache.has(url)) return textureCache.get(url);

  const tex = textureLoader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  textureCache.set(url, tex);
  return tex;
}

function buildThreeMaterialFromDef(def = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: def.rgbValue
      ? `rgb(${String(def.rgbValue).replaceAll('_', ',')})`
      : def.color || '#cccccc',
    roughness: Number.isFinite(def.roughness) ? def.roughness : 0.9,
    metalness: Number.isFinite(def.metalness) ? def.metalness : 0.0,
    side: THREE.DoubleSide,
  });

  if (def.mapUrl) {
    const map = loadTextureCached(def.mapUrl);
    if (map) {
      map.colorSpace = THREE.SRGBColorSpace;
      map.repeat.set(def.repeatX || 1, def.repeatY || 1);
      material.map = map;
    }
  }

  if (def.mapTexture) {
    def.mapTexture.colorSpace = THREE.SRGBColorSpace;
    material.map = def.mapTexture;
  }

  if (def.normalMapUrl) {
    const normalMap = loadTextureCached(def.normalMapUrl);
    if (normalMap) {
      normalMap.repeat.set(def.repeatX || 1, def.repeatY || 1);
      material.normalMap = normalMap;
    }
  }

  if (def.roughnessMapUrl) {
    const roughnessMap = loadTextureCached(def.roughnessMapUrl);
    if (roughnessMap) {
      roughnessMap.repeat.set(def.repeatX || 1, def.repeatY || 1);
      material.roughnessMap = roughnessMap;
    }
  }

  material.needsUpdate = true;
  return material;
}

// Helpers internos
function markNeedsUpdate(material) {
  if (!material) return;
  if (Array.isArray(material)) material.forEach((m) => m && (m.needsUpdate = true));
  else material.needsUpdate = true;
}

function restoreMeshMaterial(mesh) {
  const orig = mesh?.userData?.__origMaterial;
  if (!orig) return;

  mesh.material = orig;
  markNeedsUpdate(mesh.material);
}

function resolveMaterial(materialDef) {
  const isTextured =
    !!materialDef?.mapUrl ||
    !!materialDef?.mapTexture ||
    !!materialDef?.normalMapUrl ||
    !!materialDef?.roughnessMapUrl ||
    materialDef?.materialType === 'floor' ||
    materialDef?.useTexture === true;

  if (isTextured) {
    return buildThreeMaterialFromDef(materialDef);
  }

  return (
    getThreeMaterialFromDef(materialDef) ||
    buildThreeMaterialFromDef(materialDef) ||
    new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.75,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
  );
}

function isPreservedDuctNode(obj) {
  if (!obj) return false;
  if (obj.userData?.isDuctCimbra || obj.userData?.isDuctPlate || obj.userData?.isDuctProtectedPart) return true;
  const kind = String(obj.userData?.kind || obj.type || '').trim().toLowerCase();
  const category = String(obj.userData?.meta?.category || '').trim().toLowerCase();
  const role = String(obj.userData?.role || obj.userData?.componentRole || '').trim().toUpperCase();
  const name = String(obj.name || '').trim().toUpperCase();
  if (kind === 'ductopiso' || kind === 'ductotecho' || kind === 'ducto') return true;
  if (
    category === 'ductos-a-piso' ||
    category === 'ductos-a-techo' ||
    category === 'ductos_a_piso' ||
    category === 'ductos_a_techo' ||
    category === 'ductos'
  ) return true;
  if (role === 'FLOOR_DUCT' || role === 'CEILING_DUCT' || role === 'DUCT') return true;
  if (
    name.startsWith('FLOOR_DUCT_') ||
    name.startsWith('CEILING_DUCT_') ||
    name.startsWith('KONCISA_DUCT_') ||
    name.startsWith('DUCTO_')
  ) return true;
  return false;
}

export function applyMaterialToObject3D(root, materialCode, materialDef, options = {}) {
  if (!root || isPreservedDuctNode(root)) return;

  const code = materialCode ? String(materialCode) : null;
  const visualOnly = options.visualOnly === true;
  if (visualOnly) visualFinishIdentity.set(root, options.identity);
  else {
    visualFinishIdentity.delete(root);
    root.userData.materialCode = code;
  }

  // Sin acabado: restaurar originales
  if (!code && !visualOnly) {
    root.traverse((obj) => {
      if (!obj?.isMesh) return;
      if (isPreservedDuctNode(obj)) return;
      visualFinishIdentity.delete(obj);
      restoreMeshMaterial(obj);
    });
    return;
  }

  const baseMat = resolveMaterial(materialDef);

  root.traverse((obj) => {
    if (!obj?.isMesh) return;
    if (isPreservedDuctNode(obj)) return;
    if (visualOnly) visualFinishIdentity.set(obj, options.identity);
    else visualFinishIdentity.delete(obj);

    // guardar original una sola vez
    if (!obj.userData.__origMaterial) obj.userData.__origMaterial = obj.material;

    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map(() => (baseMat.clone ? baseMat.clone() : baseMat));
    } else {
      obj.material = baseMat.clone ? baseMat.clone() : baseMat;
    }

    if (!visualOnly) obj.userData.materialCode = code;
    markNeedsUpdate(obj.material);
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
}

export function applyMaterialToMesh(mesh, materialCode, materialDef, options = {}) {
  if (!mesh?.isMesh || isPreservedDuctNode(mesh)) return;

  const code = materialCode ? String(materialCode) : null;
  const visualOnly = options.visualOnly === true;
  if (visualOnly) visualFinishIdentity.set(mesh, options.identity);
  else {
    visualFinishIdentity.delete(mesh);
    mesh.userData.materialCode = code;
  }

  // Sin acabado: restaurar solo este mesh
  if (!code && !visualOnly) {
    restoreMeshMaterial(mesh);
    return;
  }

  const baseMat = resolveMaterial(materialDef);

  // guardar original una sola vez
  if (!mesh.userData.__origMaterial) mesh.userData.__origMaterial = mesh.material;

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(() => (baseMat.clone ? baseMat.clone() : baseMat));
  } else {
    mesh.material = baseMat.clone ? baseMat.clone() : baseMat;
  }

  markNeedsUpdate(mesh.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}
