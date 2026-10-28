import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { resolveCritterium8JunctionAsset } from './junctionAssetResolver.js';
import {
  disposeCritterium8ProceduralJunction,
  renderCritterium8ProceduralJunction,
} from './proceduralJunctionRenderer.js';

export function buildCritterium8Junction3D({ junction = {}, resolution = {}, layout, loadAccessory } = {}) {
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
  if (asset.src) {
    const loader = loadAccessory || (async (src) => (await new GLTFLoader().loadAsync(src)).scene);
    Promise.resolve().then(() => loader(asset.src)).then((accessory) => {
      if (!accessory?.isObject3D) throw new Error('CRITTERIUM_ACCESSORY_INVALID_SCENE');
      if (group.userData.disposed) {
        disposeAccessory(accessory);
        return;
      }
      accessory.updateMatrixWorld(true);
      const accessoryBounds = new THREE.Box3().setFromObject(accessory);
      if (accessoryBounds.isEmpty()) throw new Error('CRITTERIUM_ACCESSORY_EMPTY_SCENE');
      const center = accessoryBounds.getCenter(new THREE.Vector3());
      accessory.position.x -= center.x;
      accessory.position.z -= center.z;
      accessory.position.y += Number(layout.bounds?.maxY || 0) - accessoryBounds.min.y;
      accessory.name = `CRITTERIUM_8_ACCESSORY_${asset.metadata.kitCode}`;
      accessory.traverse((child) => {
        child.userData = { ...child.userData, ...visual.userData, isPartRoot: false, accessoryCode: asset.metadata.kitCode };
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
      });
      visual.add(accessory);
      // The procedural top piece remains the fallback until the GLB is ready.
      const nativeTip = visual.children.find((child) => child.userData?.critterium8JunctionRole === 'TIP');
      if (nativeTip) {
        visual.remove(nativeTip);
        disposeCritterium8ProceduralJunction(nativeTip);
      }
      group.userData.accessoryVisualSource = 'GLB';
    }).catch((error) => {
      group.userData.accessoryVisualSource = 'NATIVE';
      group.userData.accessoryLoadError = String(error?.message || error);
    });
  }
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
  if (group?.userData) group.userData.disposed = true;
  for (const child of [...(group?.children || [])]) {
    const accessory = child.children.find((item) => item.name?.startsWith('CRITTERIUM_8_ACCESSORY_'));
    if (accessory) { child.remove(accessory); disposeAccessory(accessory); }
    disposeCritterium8ProceduralJunction(child);
  }
  group?.clear?.();
}

function disposeAccessory(root) {
  root.traverse((child) => {
    child.geometry?.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => material.dispose?.());
  });
  root.clear();
}
