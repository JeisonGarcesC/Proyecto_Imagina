import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  partitionCritterium8Frames,
  prepareCritterium8Sequence,
  prepareCritterium8SequenceRebuild,
  validateFrameAdditionToCritterium8Sequence,
} from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import {
  registerCritterium8Sequence,
  replaceCritterium8Sequence,
  unregisterCritterium8Sequence,
} from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import {
  getCritterium8EditableTarget,
  getCritterium8SequenceRoot,
} from '../src/mepal/critterium8/utils/critterium8Selection.js';
import { HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

const radians = (degrees) => degrees * Math.PI / 180;

function frameFromStart(frameId, angleDeg, start = { x: 0, z: 0 }, widthCm = 100) {
  const rotationY = radians(angleDeg);
  const half = widthCm / 200;
  const frame = new THREE.Group();
  frame.position.set(start.x + Math.cos(rotationY) * half, 0, start.z - Math.sin(rotationY) * half);
  frame.rotation.y = rotationY;
  frame.userData = {
    kind: 'CRITTERIUM_8_ASSEMBLY', family: 'CRITTERIUM_8',
    frameId, instanceId: `${frameId}_INSTANCE`, isAssemblyRoot: true,
    definition: { widthCm, heightCm: 90, frameMode: 'HALF_HEIGHT' },
    config: { widthCm, heightCm: 90, frameMode: 'HALF_HEIGHT', projectHeightCm: 90 },
    bounds2d: { localCenter: [0, 0.45, 0], sizeLocal: [widthCm / 100, 0.9, 0.08] },
  };
  const part = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.9, 0.02), new THREE.MeshBasicMaterial());
  part.userData = { kind: 'CRITTERIUM_8_PART', isPartRoot: true, instanceId: `${frameId}_PART` };
  frame.add(part);
  frame.updateMatrixWorld(true);
  return frame;
}

function prepareLine(count = 2) {
  const frames = Array.from({ length: count }, (_, index) => frameFromStart(String.fromCharCode(65 + index), 0, { x: index, z: 0 }));
  const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(prepared.success, true);
  return { frames, prepared };
}

test('crea Sequence productiva para 2 Frames, línea de 3, L, T y X', () => {
  const cases = [
    [frameFromStart('A', 0), frameFromStart('B', 180)],
    prepareLine(3).frames,
    [frameFromStart('L1', 0), frameFromStart('L2', 90)],
    [frameFromStart('T1', 0), frameFromStart('T2', 180), frameFromStart('T3', 90)],
    [frameFromStart('X1', 0), frameFromStart('X2', 180), frameFromStart('X3', 90), frameFromStart('X4', 270)],
  ];
  cases.forEach((frames) => {
    const result = prepareCritterium8Sequence({ frameAssemblies: frames });
    assert.equal(result.success, true);
    assert.equal(result.sequenceRoot.userData.frameIds.length, frames.length);
  });
});

test('registro central asigna parentSequenceId, selection root y limpia pickables', () => {
  const scene = new THREE.Scene();
  const frames = [frameFromStart('A', 0), frameFromStart('B', 0, { x: 1, z: 0 })];
  frames.forEach((frame) => scene.add(frame));
  const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(prepared.success, true);
  const parts = frames.flatMap((frame) => [{ code: frame.userData.instanceId, obj: frame }, { code: frame.children[0].userData.instanceId, obj: frame.children[0] }]);
  const pickables = frames.map((frame) => frame.children[0]);
  registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
  assert.equal(frames.every((frame) => frame.userData.parentSequenceId === prepared.sequence.id), true);
  assert.equal(getCritterium8SequenceRoot(frames[0]), prepared.sequenceRoot);
  assert.equal(getCritterium8EditableTarget(frames[0].children[0]), frames[0].children[0]);
  assert.equal(pickables.some((item) => item.userData.kind === 'CRITTERIUM_8_JUNCTION_PART'), true);
  const dissolved = unregisterCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, partsRegistry: parts, pickables, preserveFrames: true, targetParent: scene });
  assert.equal(dissolved.frames.every((frame) => frame.parent === scene && frame.userData.parentSequenceId === null), true);
  assert.equal(pickables.some((item) => item.userData.kind === 'CRITTERIUM_8_JUNCTION_PART'), false);
});

test('MOVE y ROTATE del root preservan estructura y no reconstruyen Junctions', () => {
  const { prepared } = prepareLine(2);
  const junctions = prepared.sequenceRoot.children.filter((child) => child.userData.kind === 'CRITTERIUM_8_JUNCTION');
  prepared.sequenceRoot.position.set(5, 0, -3);
  prepared.sequenceRoot.rotation.y = Math.PI / 2;
  prepared.sequenceRoot.updateMatrixWorld(true);
  assert.deepEqual(prepared.sequenceRoot.children.filter((child) => child.userData.kind === 'CRITTERIUM_8_JUNCTION'), junctions);
  assert.equal(prepared.sequenceRoot.userData.metadata.dirtyConnections, false);
});

test('rebuild conserva Frames, instanceIds, TYPE_B y useDuct en nodos estables', () => {
  const { frames, prepared } = prepareLine(2);
  const center = prepared.sequence.junctions.find((junction) => junction.type === 'DEG_180');
  center.variant = 'TYPE_B';
  center.metadata = { ...center.metadata, explicitVariant: 'TYPE_B', useDuct: true };
  prepared.sequenceRoot.userData.sequence = prepared.sequence;
  const rebuilt = prepareCritterium8SequenceRebuild(prepared.sequenceRoot);
  assert.equal(rebuilt.success, true);
  assert.equal(frames.every((frame) => rebuilt.sequenceRoot.children.includes(frame)), true);
  const nextCenter = rebuilt.sequence.junctions.find((junction) => junction.id === center.id);
  assert.equal(nextCenter.variant, 'TYPE_B');
  assert.equal(nextCenter.metadata.useDuct, true);
});

test('matching por endpoints conserva overrides aunque cambie sequenceId', () => {
  const { frames, prepared } = prepareLine(2);
  const center = prepared.sequence.junctions.find((junction) => junction.type === 'DEG_180');
  center.variant = 'TYPE_B';
  center.metadata = { ...center.metadata, explicitVariant: 'TYPE_B', useDuct: true };
  const rebuilt = prepareCritterium8Sequence({
    frameAssemblies: frames,
    options: { sequenceId: 'SEQUENCE_RENAMED' },
    previousSequence: prepared.sequence,
  });
  assert.equal(rebuilt.success, true);
  const nextCenter = rebuilt.sequence.junctions.find((junction) => junction.type === 'DEG_180');
  assert.notEqual(nextCenter.id, center.id);
  assert.equal(nextCenter.variant, 'TYPE_B');
  assert.equal(nextCenter.metadata.useDuct, true);
});

test('add Frame conectado valida y desconectado falla', () => {
  const { prepared } = prepareLine(2);
  const connected = frameFromStart('C', 0, { x: 2, z: 0 });
  const disconnected = frameFromStart('D', 0, { x: 20, z: 0 });
  assert.equal(validateFrameAdditionToCritterium8Sequence(prepared.sequenceRoot, connected).success, true);
  assert.equal(validateFrameAdditionToCritterium8Sequence(prepared.sequenceRoot, disconnected).reason, 'FRAME_NOT_CONNECTED_TO_SEQUENCE');
});

test('remove B de A-B-C divide en dos resultados individuales y conserva transforms', () => {
  const { frames, prepared } = prepareLine(3);
  const scene = new THREE.Scene();
  scene.add(prepared.sequenceRoot);
  const worldBefore = frames.map((frame) => frame.getWorldPosition(new THREE.Vector3()).toArray());
  frames.forEach((frame) => prepared.sequenceRoot.parent.attach(frame));
  const partitions = partitionCritterium8Frames([frames[0], frames[2]]);
  assert.equal(partitions.length, 2);
  assert.equal(partitions.every((item) => item.shouldCreateSequence === false), true);
  assert.deepEqual(frames.map((frame) => frame.getWorldPosition(new THREE.Vector3()).toArray()), worldBefore);
});

test('replace transaccional elimina Junctions viejos y mantiene dos Sequences independientes', () => {
  const first = prepareLine(2);
  const secondFrames = [frameFromStart('C', 0, { x: 10, z: 0 }), frameFromStart('D', 0, { x: 11, z: 0 })];
  const second = prepareCritterium8Sequence({ frameAssemblies: secondFrames });
  const scene = new THREE.Scene();
  const parts = [];
  const pickables = [];
  registerCritterium8Sequence({ sequenceRoot: first.prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
  registerCritterium8Sequence({ sequenceRoot: second.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
  const oldJunctions = first.prepared.sequenceRoot.children.filter((item) => item.userData.kind === 'CRITTERIUM_8_JUNCTION');
  const rebuilt = prepareCritterium8SequenceRebuild(first.prepared.sequenceRoot);
  replaceCritterium8Sequence({ previousRoot: first.prepared.sequenceRoot, nextRoot: rebuilt.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
  assert.equal(oldJunctions.every((junction) => junction.children.length === 0), true);
  assert.equal(second.sequenceRoot.parent, scene);
  unregisterCritterium8Sequence({ sequenceRoot: rebuilt.sequenceRoot, partsRegistry: parts, pickables });
  unregisterCritterium8Sequence({ sequenceRoot: second.sequenceRoot, partsRegistry: parts, pickables });
  assert.equal(parts.length, 0);
  assert.equal(pickables.length, 0);
});

test('History expone acciones lógicas sin acción por Junction mesh', () => {
  for (const key of ['CRITTERIUM_8_SEQUENCE_CREATE', 'CRITTERIUM_8_SEQUENCE_REBUILD', 'CRITTERIUM_8_SEQUENCE_DISSOLVE', 'CRITTERIUM_8_SEQUENCE_ADD_FRAME', 'CRITTERIUM_8_SEQUENCE_REMOVE_FRAME']) {
    assert.equal(HISTORY_ACTION_TYPES[key], key);
  }
});
