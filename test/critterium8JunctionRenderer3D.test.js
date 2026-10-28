import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three-stdlib';

import { buildCritterium8Junction3D, disposeCritterium8Junction3D } from '../src/mepal/critterium8/junctions/renderers/Critterium8JunctionRenderer3D.js';
import { getCritterium8JunctionGeometryCacheSize } from '../src/mepal/critterium8/junctions/renderers/proceduralJunctionRenderer.js';
import { getCritterium8JunctionMaterialCacheSize } from '../src/mepal/critterium8/junctions/renderers/junctionPreviewMaterialResolver.js';
import { buildCritterium8FrameSequence3D, disposeCritterium8Sequence3D } from '../src/mepal/critterium8/builders/Critterium8SequenceRenderBuilder.js';

function fixture(type, options = {}) {
  const junctionId = `J_${type}`;
  const part = options.missing ? null : { id: `P_${type}`, type: 'JUNCTION_KIT', code: `CODE_${type}`, metadata: { variant: type === 'DEG_180_TYPE_B' ? 'TYPE_B' : null } };
  const diagnostics = [...(options.diagnostics || [])];
  const junction = { id: junctionId, type, sequenceId: 'SEQ', point: { x: 4, z: -2 }, metadata: {} };
  const resolution = { junctionId, type, kitCode: part?.code || null, parts: part ? [part] : [], diagnostics, valid: Boolean(part) };
  const layout = {
    junctionId, junctionType: type, position: { x: 4, y: 0, z: -2 }, rotationY: Math.PI / 3,
    bounds: { minX: -0.06, maxX: 0.06, minY: 0, maxY: 0.9, minZ: -0.06, maxZ: 0.06 },
    anchors: [], placements: part ? [{ partId: part.id }] : [], diagnostics,
    metadata: { incomingDirections: [], includesTip: options.includesTip === true, replacedByDuct: options.replacedByDuct === true },
  };
  return { junction, resolution, layout };
}

test('renderer procedural diferencia TERMINAL, 180, TYPE B, 90, T y X', () => {
  const childCounts = {};
  for (const type of ['TERMINAL', 'DEG_180', 'DEG_180_TYPE_B', 'DEG_90', 'T', 'X']) {
    const group = buildCritterium8Junction3D(fixture(type));
    childCounts[type] = group.children[0].children.length;
    assert.equal(group.userData.junctionType, type);
    assert.equal(group.userData.provisionalGeometry, true);
    assert.equal(group.children[0].userData.kind, 'CRITTERIUM_8_JUNCTION_PART');
    disposeCritterium8Junction3D(group);
  }
  assert.equal(childCounts.TERMINAL, 2);
  assert.equal(childCounts.DEG_180, 3);
  assert.equal(childCounts.DEG_90, 3);
  assert.equal(childCounts.T, 4);
  assert.equal(childCounts.X, 5);
});

test('45/135, 120 y parte comercial ausente renderizan placeholder', () => {
  for (const type of ['DEG_45_135', 'DEG_120', 'DEG_90']) {
    const group = buildCritterium8Junction3D(fixture(type, { missing: true }));
    assert.deepEqual(group.userData.renderReport.placeholderJunctions, [`J_${type}`]);
    assert.equal(group.children[0].children.length, 1);
    disposeCritterium8Junction3D(group);
  }
});

test('transición de altura usa placeholder y replacedByDuct no dibuja kit', () => {
  const transition = fixture('DEG_90', { missing: true, diagnostics: [{ code: 'HEIGHT_TRANSITION_REQUIRED' }] });
  const transitionGroup = buildCritterium8Junction3D(transition);
  assert.equal(transitionGroup.userData.heightTransitionRequired, true);
  assert.equal(transitionGroup.userData.renderReport.placeholderJunctions.length, 1);
  disposeCritterium8Junction3D(transitionGroup);

  const duct = fixture('T', { missing: true, replacedByDuct: true, diagnostics: [{ code: 'REPLACED_BY_DUCT' }] });
  const ductGroup = buildCritterium8Junction3D(duct);
  assert.equal(ductGroup.children[0].children.length, 0);
  assert.deepEqual(ductGroup.userData.renderReport.replacedByDuct, ['J_T']);
  disposeCritterium8Junction3D(ductGroup);
});

test('renderer aplica posición mundial y rotationY exactamente una vez', () => {
  const input = fixture('DEG_90');
  const before = structuredClone(input);
  const group = buildCritterium8Junction3D(input);
  assert.deepEqual(group.position.toArray(), [4, 0, -2]);
  assert.equal(group.rotation.y, Math.PI / 3);
  const childWorld = new THREE.Vector3();
  group.children[0].getWorldPosition(childWorld);
  assert.deepEqual(childWorld.toArray(), [4, 0, -2]);
  assert.deepEqual(input, before);
  disposeCritterium8Junction3D(group);
});

function frame(frameId, x) {
  const group = new THREE.Group();
  group.userData = {
    kind: 'CRITTERIUM_8_ASSEMBLY', frameId, instanceId: `${frameId}_INSTANCE`,
    bounds2d: { localCenter: [0, 0.45, 0], sizeLocal: [1, 0.9, 0.08] },
  };
  group.position.set(x, 0, 1);
  group.updateMatrixWorld(true);
  return group;
}

test('Sequence Root reutiliza Frames, agrega Junction y conserva transforms mundo', () => {
  const first = frame('A', 0);
  const second = frame('B', 1);
  const beforeFirst = first.getWorldPosition(new THREE.Vector3()).toArray();
  const data = fixture('DEG_180');
  const sequence = { id: 'SEQ', frameIds: ['A', 'B'], junctions: [data.junction] };
  const root = buildCritterium8FrameSequence3D({ sequence, frameInstances: [first, second], junctionResolutions: [data.resolution], junctionLayouts: [data.layout] });
  assert.equal(root.userData.kind, 'CRITTERIUM_8_SEQUENCE_ASSEMBLY');
  assert.deepEqual(root.userData.frameIds, ['A', 'B']);
  assert.deepEqual(first.getWorldPosition(new THREE.Vector3()).toArray(), beforeFirst);
  assert.equal(root.children.includes(first), true);
  assert.equal(root.children.some((child) => child.userData.kind === 'CRITTERIUM_8_JUNCTION'), true);
  assert.ok(root.userData.bounds);
  disposeCritterium8Sequence3D(root);
});

test('Sequence representa nodos T y X con 3 y 4 Frames', () => {
  for (const [type, count] of [['T', 3], ['X', 4]]) {
    const frames = Array.from({ length: count }, (_, index) => frame(String.fromCharCode(65 + index), index));
    const data = fixture(type);
    const sequence = { id: `SEQ_${type}`, frameIds: frames.map((item) => item.userData.frameId), junctions: [data.junction] };
    const root = buildCritterium8FrameSequence3D({ sequence, frameInstances: frames, junctionResolutions: [data.resolution], junctionLayouts: [data.layout] });
    assert.equal(root.userData.frameIds.length, count);
    assert.equal(root.userData.renderReport.renderedJunctions.length, 1);
    disposeCritterium8Sequence3D(root);
  }
});

test('geometrías y materiales compartidos se liberan por referencia', () => {
  const first = buildCritterium8Junction3D(fixture('DEG_90'));
  const second = buildCritterium8Junction3D(fixture('DEG_90'));
  assert.ok(getCritterium8JunctionGeometryCacheSize() > 0);
  assert.ok(getCritterium8JunctionMaterialCacheSize() > 0);
  disposeCritterium8Junction3D(first);
  assert.ok(getCritterium8JunctionGeometryCacheSize() > 0);
  disposeCritterium8Junction3D(second);
  assert.equal(getCritterium8JunctionGeometryCacheSize(), 0);
  assert.equal(getCritterium8JunctionMaterialCacheSize(), 0);
});

test('los dos accesorios GLB de 90 cm se colocan arriba, a escala natural y con selección de kit', async () => {
  for (const [type, kitCode, fileName] of [
    ['DEG_180', '22000014319', 'CRAC070100.glb'],
    ['TERMINAL', '22191900126', 'CRAC070010.glb'],
  ]) {
    const input = fixture(type, { includesTip: true });
    input.layout.position = { x: 0, y: 0, z: 0 };
    input.layout.rotationY = 0;
    input.resolution.parts[0].code = kitCode;
    input.resolution.kitCode = kitCode;
    const bytes = await readFile(new URL(`../public/assets/models/CriterriumModels/${fileName}`, import.meta.url));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const originalSize = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
    const group = buildCritterium8Junction3D({ ...input, loadAccessory: async () => gltf.scene });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const visual = group.children[0];
    const accessory = visual.children.find((child) => child.name === `CRITTERIUM_8_ACCESSORY_${kitCode}`);
    assert.ok(accessory);
    assert.equal(group.userData.accessoryVisualSource, 'GLB');
    assert.equal(visual.children.some((child) => child.userData.critterium8JunctionRole === 'TIP'), false);
    const bounds = new THREE.Box3().setFromObject(accessory);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.distanceTo(originalSize) < 1e-6);
    assert.ok(Math.abs(bounds.min.y - input.layout.bounds.maxY) < 1e-6);
    assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).x) < 1e-6);
    assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).z) < 1e-6);
    accessory.traverse((child) => {
      if (child.isMesh) {
        assert.equal(child.userData.junctionId, input.junction.id);
        assert.equal(child.userData.isPartRoot, false);
      }
    });
    disposeCritterium8Junction3D(group);
  }
});

test('el accesorio mantiene el remate nativo si falla la carga', async () => {
  const input = fixture('TERMINAL', { includesTip: true });
  input.resolution.parts[0].code = '22191900126';
  const group = buildCritterium8Junction3D({ ...input, loadAccessory: async () => { throw new Error('LOAD_FAILED'); } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(group.userData.accessoryVisualSource, 'NATIVE');
  assert.equal(group.children[0].children.some((child) => child.userData.critterium8JunctionRole === 'TIP'), true);
  disposeCritterium8Junction3D(group);
});

test('el accesorio sigue la rotación del kit y una copia conserva su propia geometría', async () => {
  const input = fixture('DEG_180', { includesTip: true });
  input.resolution.parts[0].code = '22000014319';
  const loadAccessory = async () => new THREE.Mesh(new THREE.BoxGeometry(0.089, 0.011, 0.065), new THREE.MeshStandardMaterial());
  const first = buildCritterium8Junction3D({ ...input, loadAccessory });
  const second = buildCritterium8Junction3D({ ...input, loadAccessory });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const accessory = first.children[0].children.find((child) => child.name.startsWith('CRITTERIUM_8_ACCESSORY_'));
  const duplicate = second.children[0].children.find((child) => child.name.startsWith('CRITTERIUM_8_ACCESSORY_'));
  assert.ok(accessory && duplicate);
  assert.notEqual(accessory, duplicate);
  assert.equal(first.rotation.y, input.layout.rotationY);
  first.rotation.y += Math.PI / 2;
  first.updateMatrixWorld(true);
  second.updateMatrixWorld(true);
  assert.notDeepEqual(accessory.getWorldQuaternion(new THREE.Quaternion()).toArray(), duplicate.getWorldQuaternion(new THREE.Quaternion()).toArray());
  disposeCritterium8Junction3D(first);
  assert.ok(duplicate.parent);
  disposeCritterium8Junction3D(second);
});
