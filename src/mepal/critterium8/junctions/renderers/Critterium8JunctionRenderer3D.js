import * as THREE from 'three';
import { resolveCritterium8JunctionAsset } from './junctionAssetResolver.js';
import {
  disposeCritterium8ProceduralJunction,
  renderCritterium8ProceduralJunction,
} from './proceduralJunctionRenderer.js';

export function buildCritterium8Junction3D({ junction = {}, resolution = {}, layout } = {}) {
  if (!layout) throw new Error('CRITTERIUM8_JUNCTION_LAYOUT_REQUIRED');
  const asset = resolveCritterium8JunctionAsset({ junction, resolution });
  const group = new THREE.Group();
  const junctionId = String(layout.junctionId || junction.id || resolution.junctionId || 'UNIDENTIFIED');
  const junctionType = String(layout.junctionType || resolution.type || junction.type || '').toUpperCase();
  const visual = renderCritterium8ProceduralJunction({ layout, asset });

  group.name = `CRITTERIUM_8_JUNCTION_${junctionId}`;
  group.position.set(Number(layout.position?.x || 0), Number(layout.position?.y || 0), Number(layout.position?.z || 0));
  group.rotation.y = Number(layout.rotationY || 0);
  group.userData = {
    kind: 'CRITTERIUM_8_JUNCTION', family: 'CRITTERIUM_8',
    junctionId, junctionType, sequenceId: junction.sequenceId || junction.metadata?.sequenceId || null,
    kitCode: asset.metadata.kitCode, isJunctionRoot: true, selectionRoot: false,
    editableTarget: 'JUNCTION', provisionalGeometry: asset.metadata.provisionalGeometry,
    point: { ...layout.position },
    directions: (layout.metadata?.incomingDirections || []).map((item) => ({ ...item, direction: { ...item.direction } })),
    requiresCeilingU: layout.metadata?.requiresCeilingU === true,
    includesTip: layout.metadata?.includesTip === true,
    heightTransitionRequired: asset.metadata.heightTransitionRequired,
    replacedByDuct: asset.metadata.replacedByDuct,
    variant: asset.metadata.variant,
  };
  visual.userData = {
    ...visual.userData,
    kind: 'CRITTERIUM_8_JUNCTION_PART', family: 'CRITTERIUM_8', junctionId, junctionType,
    kitCode: asset.metadata.kitCode, sequenceId: group.userData.sequenceId, isPartRoot: true,
  };
  visual.traverse((child) => {
    if (child === visual) return;
    child.userData = { ...child.userData, ...visual.userData, isPartRoot: false };
  });
  group.add(visual);
  const diagnostics = (layout.diagnostics || []).map((item) => ({ ...item }));
  if (asset.type === 'PLACEHOLDER') diagnostics.push({ code: 'JUNCTION_PLACEHOLDER_RENDERED', level: 'WARNING', junctionId });
  group.userData.renderReport = {
    renderedJunctions: asset.metadata.replacedByDuct ? [] : [junctionId],
    placeholderJunctions: asset.type === 'PLACEHOLDER' ? [junctionId] : [],
    replacedByDuct: asset.metadata.replacedByDuct ? [junctionId] : [],
    missingAssets: asset.type === 'PLACEHOLDER' ? [junctionId] : [],
    diagnostics,
  };
  return group;
}

export function disposeCritterium8Junction3D(group) {
  for (const child of [...(group?.children || [])]) disposeCritterium8ProceduralJunction(child);
  group?.clear?.();
}
