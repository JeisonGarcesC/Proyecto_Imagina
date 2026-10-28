import * as THREE from 'three';

export const MAX_IMPORTED_MODEL_DIMENSION = 1000;

const HORIZONTAL_MIN_SIZE = 500;
const CONTEXT_MAX_SIZE = 1500;
const FLAT_HEIGHT = 0.01;
const RELATIVE_SIZE = 1.05;
const RELATIVE_AREA = 1.5;
const MIN_REPEATED_PAIRS = 4;
const BACKGROUND_MATERIAL = /^(?:white\s+floor|fondo\s+blanco)$/i;

const boxSize = (box) => box.getSize(new THREE.Vector3());
const boxData = (box) => ({ min: box.min.toArray(), max: box.max.toArray(), size: boxSize(box).toArray() });
const exceedsLimit = (box) => {
  const size = boxSize(box);
  return Math.max(size.x, size.y, size.z) > MAX_IMPORTED_MODEL_DIMENSION;
};
const validBox = (box) => !box.isEmpty() && [...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite);
const boxKey = (box) => [...box.min.toArray(), ...box.max.toArray()].map((value) => Math.round(value * 1000)).join(':');

function renderableBox(object) {
  if (!object.geometry) return null;
  if (object.isSkinnedMesh || object.isInstancedMesh || object.morphTargetInfluences?.length) {
    return new THREE.Box3().setFromObject(object);
  }
  if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
  return object.geometry.boundingBox?.clone().applyMatrix4(object.matrixWorld) || null;
}

function isSimpleHorizontalQuad(entry) {
  const { object, box } = entry;
  const geometry = object.geometry;
  const size = boxSize(box);
  return object.isMesh && !object.isSkinnedMesh && !object.isInstancedMesh &&
    !object.morphTargetInfluences?.length && !Array.isArray(object.material) &&
    object.children.length === 0 &&
    geometry?.attributes?.position?.count === 4 && geometry.index?.count === 6 &&
    geometry.groups.length <= 1 && size.x >= HORIZONTAL_MIN_SIZE &&
    size.z >= HORIZONTAL_MIN_SIZE && size.x <= CONTEXT_MAX_SIZE &&
    size.z <= CONTEXT_MAX_SIZE && size.y <= FLAT_HEIGHT;
}

function diagnosticEntry(entry, signals) {
  return {
    name: entry.object.name || null,
    material: entry.object.material?.name || null,
    ...boxData(entry.box),
    signals,
  };
}

// Classification only changes which boxes take part in scale validation.
// The original scene, materials and transforms remain untouched.
export function analyzeImportedModelBounds(object) {
  object.updateMatrixWorld(true);
  const totalBounds = new THREE.Box3().setFromObject(object);
  const entries = [];
  object.traverse((child) => {
    if (!child.isMesh && !child.isLine && !child.isPoints) return;
    const box = renderableBox(child);
    if (box && !box.isEmpty()) entries.push({ object: child, box });
  });

  const ordinary = entries.filter((entry) => !isSimpleHorizontalQuad(entry));
  const ordinaryBounds = new THREE.Box3().makeEmpty();
  ordinary.forEach(({ box }) => ordinaryBounds.union(box));
  const ordinarySize = boxSize(ordinaryBounds);
  const candidates = entries.filter((entry) => {
    if (!isSimpleHorizontalQuad(entry) || !validBox(ordinaryBounds) ||
      ordinarySize.x <= 1 || ordinarySize.y <= 1 || ordinarySize.z <= 1) return false;
    const size = boxSize(entry.box);
    const y = entry.box.getCenter(new THREE.Vector3()).y;
    const nearBase = y >= ordinaryBounds.min.y - FLAT_HEIGHT &&
      y <= ordinaryBounds.min.y + Math.max(5, ordinarySize.y * 0.5);
    return nearBase && size.x >= ordinarySize.x * RELATIVE_SIZE &&
      size.z >= ordinarySize.z * RELATIVE_SIZE &&
      size.x * size.z >= ordinarySize.x * ordinarySize.z * RELATIVE_AREA;
  });

  const byBox = new Map();
  const byMaterial = new Map();
  for (const entry of candidates) {
    const key = boxKey(entry.box);
    byBox.set(key, (byBox.get(key) || 0) + 1);
    const material = entry.object.material?.name?.trim().toLowerCase() || '';
    if (!byMaterial.has(material)) byMaterial.set(material, new Set());
    byMaterial.get(material).add(key);
  }

  const context = [];
  const ambiguous = [];
  const contextObjects = new Set();
  for (const entry of candidates) {
    const material = entry.object.material;
    const materialName = material?.name?.trim().toLowerCase() || '';
    const repeatedPair = byBox.get(boxKey(entry.box)) >= 2;
    const repeatedPattern = byMaterial.get(materialName)?.size >= MIN_REPEATED_PAIRS;
    const plainMaterial = !!material && ![
      'map', 'normalMap', 'alphaMap', 'displacementMap', 'bumpMap',
      'aoMap', 'lightMap', 'emissiveMap', 'metalnessMap', 'roughnessMap',
    ].some((key) => material[key]);
    const size = boxSize(entry.box);
    const boundedBackground = Math.max(size.x, size.z) <= CONTEXT_MAX_SIZE;
    const signals = { horizontalQuad: true, nearBase: true, largerThanPrincipal: true,
      repeatedPair, repeatedPattern, backgroundMaterial: BACKGROUND_MATERIAL.test(materialName),
      plainMaterial, boundedBackground };
    if (repeatedPair && repeatedPattern && signals.backgroundMaterial && plainMaterial && boundedBackground) {
      context.push(diagnosticEntry(entry, signals));
      contextObjects.add(entry.object);
    } else {
      ambiguous.push(diagnosticEntry(entry, signals));
    }
  }

  const principalBounds = new THREE.Box3().makeEmpty();
  for (const { object: child, box } of entries) if (!contextObjects.has(child)) principalBounds.union(box);
  const candidateObjects = new Set(candidates.map((entry) => entry.object));
  const estimatedPrincipalBounds = new THREE.Box3().makeEmpty();
  for (const { object: child, box } of entries) if (!candidateObjects.has(child)) estimatedPrincipalBounds.union(box);

  let decision = 'accept';
  if (!validBox(totalBounds) || !validBox(principalBounds)) decision = 'invalid';
  else if (exceedsLimit(totalBounds)) {
    if (exceedsLimit(principalBounds)) {
      decision = ambiguous.length && validBox(estimatedPrincipalBounds) && !exceedsLimit(estimatedPrincipalBounds)
        ? 'requires_confirmation' : 'scale';
    }
  }

  return { totalBounds, principalBounds, estimatedPrincipalBounds,
    renderableCount: entries.length, context, ambiguous, decision,
    total: boxData(totalBounds), principal: boxData(principalBounds),
    estimatedPrincipal: boxData(estimatedPrincipalBounds) };
}

export async function resolveImportedModelBoundsDecision(analysis, { confirm, restoring = false } = {}) {
  if (analysis.decision !== 'requires_confirmation') return analysis.decision;
  if (restoring) return 'restored';
  if (typeof confirm !== 'function') return 'requires_confirmation';
  return await confirm({
    totalBounds: analysis.total,
    validatedBounds: analysis.principal,
    estimatedPrincipalBounds: analysis.estimatedPrincipal,
    contextCount: analysis.context.length,
    ambiguousCount: analysis.ambiguous.length,
  }) ? 'confirmed' : 'cancelled';
}
