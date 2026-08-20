import * as THREE from 'three';
import { resolveCritterium8PartAsset } from './partAssetResolver.js';
import { cmToMeters, disposeCritterium8RenderedObject, renderCritterium8ProceduralPart } from './proceduralPartRenderer.js';

function applyPlacementTransform(object, placement) {
  object.position.set(cmToMeters(placement.position.x), cmToMeters(placement.position.y), cmToMeters(placement.position.z));
  object.rotation.set(Number(placement.rotation.x), Number(placement.rotation.y), Number(placement.rotation.z));
  object.scale.set(Number(placement.scale.x), Number(placement.scale.y), Number(placement.scale.z));
}

function applyPartMetadata(object, { frameId, part, placement, asset }) {
  object.name = `CRITTERIUM_8_${part.type}_${part.id}`;
  object.userData = {
    ...object.userData,
    kind: 'CRITTERIUM_8_PART', family: 'CRITTERIUM_8', frameId,
    partId: part.id, partType: part.type, placementId: placement.id,
    slotId: part.slotId || placement.metadata?.slotId || null,
    role: placement.metadata?.role || part.type, side: placement.metadata?.side || part.side || null,
    face: placement.metadata?.face || null, isPartRoot: true,
    provisional: asset.type === 'PLACEHOLDER', provisionalGeometry: asset.metadata?.provisionalGeometry === true,
  };
  object.traverse((child) => {
    if (child === object) return;
    child.userData = { ...child.userData, ...object.userData, isPartRoot: false, physicalIndex: object.children.indexOf(child) };
  });
}

export function renderCritterium8FrameAssembly3D({ parts = [], layout } = {}) {
  const assembly = new THREE.Group();
  const frameId = String(layout?.frameId || 'UNIDENTIFIED');
  const partById = new Map(parts.map((part) => [part.id, part]));
  const renderedParts = [];
  const placeholderParts = [];
  const missingParts = [];
  const diagnostics = [];

  assembly.name = `CRITTERIUM_8_ASSEMBLY_${frameId}`;
  assembly.userData = {
    kind: 'CRITTERIUM_8_ASSEMBLY', family: 'CRITTERIUM_8', frameId,
    isAssemblyRoot: true, selectionRoot: true, layoutId: layout?.id || null,
  };

  for (const placement of layout?.placements || []) {
    const part = partById.get(placement.partId);
    if (!part) {
      missingParts.push(placement.partId);
      diagnostics.push({ code: 'MISSING_PART', level: 'ERROR', partId: placement.partId, placementId: placement.id });
      continue;
    }
    const asset = resolveCritterium8PartAsset(part);
    const object = renderCritterium8ProceduralPart({ part, placement, asset, assemblyWidthCm: layout.widthCm });
    applyPlacementTransform(object, placement);
    applyPartMetadata(object, { frameId, part, placement, asset });
    assembly.add(object);
    renderedParts.push(part.id);
    if (asset.type === 'PLACEHOLDER') {
      placeholderParts.push(part.id);
      diagnostics.push({ code: 'MISSING_ASSET', level: 'WARNING', partId: part.id, partType: part.type });
      diagnostics.push({ code: 'UNSUPPORTED_RENDER_PART_TYPE', level: 'WARNING', partId: part.id, partType: part.type });
    }
    if (asset.metadata?.provisionalGeometry) {
      diagnostics.push({ code: 'MISSING_PHYSICAL_DIMENSIONS', level: 'WARNING', partId: part.id, partType: part.type });
      diagnostics.push({ code: 'PROVISIONAL_GEOMETRY', level: 'INFO', partId: part.id, partType: part.type });
    }
  }

  const renderedSet = new Set(renderedParts);
  for (const part of parts) {
    if (!renderedSet.has(part.id) && !missingParts.includes(part.id)) diagnostics.push({ code: 'MISSING_PLACEMENT', level: 'ERROR', partId: part.id });
  }

  assembly.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(assembly);
  const finiteBounds = bounds.isEmpty() || [bounds.min.x, bounds.min.y, bounds.min.z, bounds.max.x, bounds.max.y, bounds.max.z].every(Number.isFinite);
  if (!finiteBounds) diagnostics.push({ code: 'INVALID_RENDER_BOUNDS', level: 'ERROR' });
  assembly.userData.renderReport = { renderedParts: [...renderedParts], placeholderParts: [...placeholderParts], missingParts: [...missingParts], diagnostics: diagnostics.map((item) => ({ ...item })) };
  assembly.userData.bounds = bounds.isEmpty() ? null : { min: bounds.min.toArray(), max: bounds.max.toArray() };
  return assembly;
}

export function disposeCritterium8FrameAssembly3D(assembly) {
  disposeCritterium8RenderedObject(assembly);
}
