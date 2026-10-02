import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { registerCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { prepareCritterium8Sequence, prepareCritterium8SequenceRebuild } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { registerCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import { restoreCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequencePersistence.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';

async function createProject() {
  const scene = new THREE.Scene();
  const parts = []; const pickables = [];
  const frames = [];
  for (const index of [0, 1]) {
    const instance = await createCritterium8Instance({ widthCm: 90, heightCm: 90, instanceId: `C8_TEST_${index}`, frameId: `FRAME_${index}`, assemblyId: `ASSEMBLY_${index}`, groupId: `GROUP_${index}` });
    instance.assembly.position.x = index * 0.9;
    registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
    frames.push(instance.assembly);
  }
  const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(prepared.success, true);
  registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
  return { scene, parts, pickables, frames, root: prepared.sequenceRoot };
}

test('guardar y cargar secuencia preserva frames, junctions, conexiones, IDs y transformaciones', async () => {
  const original = await createProject();
  original.root.position.set(2, 0, -3);
  original.root.rotation.y = Math.PI / 2;
  original.root.scale.setScalar(1.2);
  original.root.updateMatrixWorld(true);
  const world = original.frames.map((frame) => frame.getWorldPosition(new THREE.Vector3()).toArray());
  const { entities } = serializeProjectEntities(original.parts);
  assert.equal(entities.filter((entity) => entity.kind === 'CRITTERIUM_8').length, 2);
  assert.equal(entities.filter((entity) => entity.kind === 'CRITTERIUM_8_SEQUENCE').length, 1);
  assert.equal(entities.some((entity) => entity.kind === 'PART' && entity.codigoPT === original.root.userData.sequenceId), false);
  const saved = JSON.parse(JSON.stringify(entities));
  const scene = new THREE.Scene(); const parts = []; const pickables = [];
  const frames = [];
  for (const entity of saved.filter((item) => item.kind === 'CRITTERIUM_8')) {
    const instance = await createCritterium8Instance({ ...entity.config, instanceId: entity.instanceId, frameId: entity.frameId, assemblyId: entity.assemblyId, groupId: entity.groupId, transform: entity.transform });
    registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
    frames.push(instance.assembly);
  }
  const entity = saved.find((item) => item.kind === 'CRITTERIUM_8_SEQUENCE');
  const root = await loadPersistedEntity(entity, { createCritterium8Sequence: (value) => restoreCritterium8Sequence(value, { scene, partsRegistry: parts, pickables, findFrame: (id) => frames.find((frame) => frame.userData.frameId === id) }) });
  assert.equal(root.userData.sequenceId, original.root.userData.sequenceId);
  assert.deepEqual(root.userData.frameIds, original.root.userData.frameIds);
  assert.deepEqual(root.userData.junctionIds, original.root.userData.junctionIds);
  assert.deepEqual(root.userData.sequence.graph.edges, original.root.userData.sequence.graph.edges);
  assert.deepEqual(root.position.toArray(), original.root.position.toArray());
  assert.deepEqual(root.quaternion.toArray(), original.root.quaternion.toArray());
  assert.deepEqual(root.scale.toArray(), original.root.scale.toArray());
  frames.forEach((frame, index) => {
    assert.equal(frame.parent, root);
    assert.equal(frame.userData.instanceId, original.frames[index].userData.instanceId);
    assert.equal(frame.userData.assemblyId, original.frames[index].userData.assemblyId);
    assert.equal(frame.userData.groupId, original.frames[index].userData.groupId);
    assert.deepEqual(frame.userData.config, original.frames[index].userData.config);
    assert.deepEqual(frame.children.map((part) => part.userData.partId), original.frames[index].children.map((part) => part.userData.partId));
    const actual = frame.getWorldPosition(new THREE.Vector3()).toArray();
    actual.forEach((value, axis) => assert.ok(Math.abs(value - world[index][axis]) < 1e-8));
  });
  assert.equal(parts.filter(({ obj }) => obj?.userData?.kind === 'CRITTERIUM_8_ASSEMBLY').length, 2);
  assert.equal(root.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_JUNCTION').length, entity.junctionIds.length);
  assert.deepEqual(root.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_JUNCTION').map((child) => child.userData.junctionId).sort(), [...entity.junctionIds].sort());
  const edited = prepareCritterium8SequenceRebuild(root);
  assert.equal(edited.success, true);
  assert.deepEqual(edited.sequenceRoot.userData.junctionIds, entity.junctionIds);
});

test('frame faltante o junction inconsistente no crea secuencia ni duplica frames', async () => {
  const project = await createProject();
  const entity = serializeProjectEntities(project.parts).entities.find((item) => item.kind === 'CRITTERIUM_8_SEQUENCE');
  const scene = new THREE.Scene(); const parts = []; const pickables = [];
  const frame = project.frames[0]; scene.attach(frame);
  parts.push({ code: frame.userData.instanceId, obj: frame });
  const context = { scene, partsRegistry: parts, pickables, findFrame: (id) => id === frame.userData.frameId ? frame : null };
  assert.throws(() => restoreCritterium8Sequence(entity, context), /CRITTERIUM_SEQUENCE_MISSING_FRAME/);
  assert.equal(parts.length, 1);
  const wrong = { ...entity, junctionIds: ['MISSING_JUNCTION'] };
  context.findFrame = (id) => project.frames.find((item) => item.userData.frameId === id);
  scene.attach(project.frames[1]);
  project.frames.forEach((item) => { item.userData.parentSequenceId = null; });
  assert.throws(() => restoreCritterium8Sequence(wrong, context), /CRITTERIUM_SEQUENCE_MISSING_JUNCTION/);
  assert.equal(parts.length, 1);
});

test('proyecto anterior con frames independientes sigue sin secuencia implícita', async () => {
  const project = await createProject();
  const entities = serializeProjectEntities(project.parts).entities.filter((entity) => entity.kind === 'CRITTERIUM_8');
  assert.equal(entities.length, 2);
  assert.equal(entities.every((entity) => entity.frameId && entity.instanceId), true);
});

test('carga repetida y conexiones alteradas se rechazan sin duplicar relaciones', async () => {
  const project = await createProject();
  const entity = serializeProjectEntities(project.parts).entities.find((item) => item.kind === 'CRITTERIUM_8_SEQUENCE');
  const scene = new THREE.Scene(); const parts = []; const pickables = [];
  const frames = [];
  for (const saved of serializeProjectEntities(project.parts).entities.filter((item) => item.kind === 'CRITTERIUM_8')) {
    const instance = await createCritterium8Instance({ ...saved.config, instanceId: saved.instanceId, frameId: saved.frameId, assemblyId: saved.assemblyId, groupId: saved.groupId, transform: saved.transform });
    registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
    frames.push(instance.assembly);
  }
  const context = { scene, partsRegistry: parts, pickables, findFrame: (id) => frames.find((frame) => frame.userData.frameId === id) };
  assert.throws(() => restoreCritterium8Sequence({ ...entity, connections: [] }, context), /CRITTERIUM_SEQUENCE_CONNECTION_MISMATCH/);
  assert.equal(parts.filter(({ obj }) => obj?.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY').length, 0);
  const root = restoreCritterium8Sequence(entity, context);
  assert.throws(() => restoreCritterium8Sequence(entity, context), /CRITTERIUM_SEQUENCE_DUPLICATE/);
  assert.equal(parts.filter(({ obj }) => obj === root).length, 1);
  assert.equal(pickables.length, new Set(pickables).size);
  const codesBefore = frames.flatMap((frame) => frame.userData.partsDefinition.map((part) => part.code)).sort();
  const codesAfter = root.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY').flatMap((frame) => frame.userData.partsDefinition.map((part) => part.code)).sort();
  assert.deepEqual(codesAfter, codesBefore);
});
