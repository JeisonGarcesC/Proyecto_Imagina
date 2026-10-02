import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { registerCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { prepareCritterium8Sequence, prepareCritterium8SequenceRebuild } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { registerCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import { restoreCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequencePersistence.js';
import {
  addSequenceToCritteriumSystem, connectCritteriumSystemSequences, createCritteriumSystem,
  createCritteriumSystemFromSequences, deleteCritteriumSystem, getCritteriumSystemRoot,
  moveCritteriumSequenceInSystem, moveCritteriumSystem, registerCritteriumSystem,
  removeSequenceFromCritteriumSystem, resolveCritteriumSelectionHierarchy,
} from '../src/mepal/critterium8/system/critteriumSystem.js';
import { restoreCritteriumSystem, serializeCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystemPersistence.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';
import { HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

async function makeScene() {
  const scene = new THREE.Scene(); const parts = []; const pickables = []; const sequences = []; const frames = [];
  for (let group = 0; group < 2; group++) {
    const pair = [];
    for (let index = 0; index < 2; index++) {
      const id = group * 2 + index;
      const instance = await createCritterium8Instance({ widthCm: 90, heightCm: 90, instanceId: `INSTANCE_${id}`, assemblyId: `ASSEMBLY_${id}`, groupId: `GROUP_${id}`, frameId: `FRAME_${id}` });
      instance.assembly.position.x = group * 3 + index * 0.9;
      registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
      pair.push(instance.assembly); frames.push(instance.assembly);
    }
    const prepared = prepareCritterium8Sequence({ frameAssemblies: pair });
    assert.equal(prepared.success, true);
    registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
    sequences.push(prepared.sequenceRoot);
  }
  return { scene, parts, pickables, sequences, frames };
}

const position = (object) => object.getWorldPosition(new THREE.Vector3()).toArray();

test('sistema vacío y composición a partir de secuencias existentes conservan objetos e IDs', async () => {
  const empty = createCritteriumSystem();
  assert.equal(empty.userData.kind, 'CRITERIUM_SYSTEM');
  assert.deepEqual(empty.userData.sequenceIds, []);
  const ctx = await makeScene();
  const before = ctx.frames.map(position);
  const system = createCritteriumSystemFromSequences(ctx.sequences);
  registerCritteriumSystem({ system, scene: ctx.scene, partsRegistry: ctx.parts });
  assert.equal(system.children[0], ctx.sequences[0]);
  assert.equal(system.children[1], ctx.sequences[1]);
  assert.deepEqual(ctx.frames.map(position), before);
  assert.deepEqual(system.userData.sequenceIds, ctx.sequences.map((sequence) => sequence.userData.sequenceId));
  assert.equal(resolveCritteriumSelectionHierarchy(ctx.frames[0].children[0]).system, system);
  assert.equal(resolveCritteriumSelectionHierarchy(ctx.frames[0].children[0]).frame, ctx.frames[0]);
  assert.equal(getCritteriumSystemRoot(ctx.sequences[0]), system);
  assert.equal(ctx.pickables.includes(system), false);
  assert.throws(() => addSequenceToCritteriumSystem(system, ctx.sequences[0]), /DUPLICATE/);
});

test('agregar y retirar secuencia conserva frames, junctions, ubicación y elimina solo la relación', async () => {
  const ctx = await makeScene();
  const system = createCritteriumSystemFromSequences([ctx.sequences[0]]);
  registerCritteriumSystem({ system, scene: ctx.scene, partsRegistry: ctx.parts });
  const before = ctx.sequences.map(position);
  const junctions = ctx.sequences[1].children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_JUNCTION');
  addSequenceToCritteriumSystem(system, ctx.sequences[1]);
  assert.deepEqual(ctx.sequences.map(position), before);
  assert.throws(() => addSequenceToCritteriumSystem(system, ctx.sequences[1]), /DUPLICATE/);
  removeSequenceFromCritteriumSystem(system, ctx.sequences[1].userData.sequenceId, ctx.scene);
  assert.equal(ctx.sequences[1].parent, ctx.scene);
  assert.deepEqual(ctx.sequences.map(position), before);
  assert.deepEqual(ctx.sequences[1].children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_JUNCTION'), junctions);
  addSequenceToCritteriumSystem(system, ctx.sequences[1]);
  assert.equal(system.children[1], ctx.sequences[1]);
  assert.deepEqual(ctx.sequences.map(position), before);
  assert.equal(ctx.parts.filter(({ obj }) => obj === ctx.sequences[1]).length, 1);
  deleteCritteriumSystem(system, { partsRegistry: ctx.parts, parent: ctx.scene });
  assert.equal(ctx.sequences[0].parent, ctx.scene);
  assert.equal(ctx.sequences[1].parent, ctx.scene);
  assert.equal(ctx.parts.some(({ obj }) => obj === system), false);
  assert.equal(prepareCritterium8SequenceRebuild(ctx.sequences[0]).success, true);
  assert.equal(ctx.frames.length, 4);
});

test('mover sistema y luego una secuencia conserva jerarquía y mueve solo los objetivos', async () => {
  const ctx = await makeScene();
  const system = createCritteriumSystemFromSequences(ctx.sequences);
  const before = ctx.sequences.map(position);
  const frameIds = ctx.frames.map((frame) => frame.userData.frameId);
  const junctionIds = ctx.sequences.map((sequence) => [...sequence.userData.junctionIds]);
  const frameLocal = ctx.frames.map((frame) => frame.position.toArray());
  const junctionLocal = ctx.sequences.flatMap((sequence) => sequence.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_JUNCTION').map((junction) => junction.position.toArray()));
  moveCritteriumSystem(system, { x: 2, z: -1 });
  assert.deepEqual(ctx.sequences.map(position), before.map(([x, y, z]) => [x + 2, y, z - 1]));
  assert.deepEqual(ctx.frames.map((frame) => frame.position.toArray()), frameLocal);
  assert.deepEqual(ctx.sequences.flatMap((sequence) => sequence.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_JUNCTION').map((junction) => junction.position.toArray())), junctionLocal);
  const secondAfterSystemMove = position(ctx.sequences[1]);
  moveCritteriumSequenceInSystem(system, ctx.sequences[0].userData.sequenceId, { x: 0.25 });
  assert.deepEqual(position(ctx.sequences[1]), secondAfterSystemMove);
  const untouchedFrame = position(ctx.frames[1]);
  const movedFrame = position(ctx.frames[0]);
  ctx.frames[0].position.x += 0.05;
  assert.deepEqual(position(ctx.frames[1]), untouchedFrame);
  assert.ok(Math.abs(position(ctx.frames[0])[0] - movedFrame[0] - 0.05) < 1e-9);
  assert.deepEqual(ctx.frames.map((frame) => frame.userData.frameId), frameIds);
  assert.deepEqual(ctx.sequences.map((sequence) => sequence.userData.junctionIds), junctionIds);
});

test('proyecto con dos secuencias restaura sistema, relaciones, conexiones, transformaciones y edición', async () => {
  const ctx = await makeScene();
  const system = createCritteriumSystemFromSequences(ctx.sequences);
  registerCritteriumSystem({ system, scene: ctx.scene, partsRegistry: ctx.parts });
  moveCritteriumSystem(system, { x: 1.5, z: -2 });
  system.rotation.y = Math.PI / 2;
  system.scale.setScalar(1.1);
  moveCritteriumSequenceInSystem(system, ctx.sequences[1].userData.sequenceId, { x: 0.2 });
  const connection = connectCritteriumSystemSequences(system, { sourceSequenceId: ctx.sequences[0].userData.sequenceId,
    sourcePointId: ctx.sequences[0].userData.junctionIds[0], targetSequenceId: ctx.sequences[1].userData.sequenceId,
    targetPointId: ctx.sequences[1].userData.junctionIds[0], type: 'RELATION' });
  assert.throws(() => connectCritteriumSystemSequences(system, { ...connection, connectionId: 'OTHER' }), /DUPLICATE/);
  const before = ctx.frames.map(position);
  const beforeCommercial = ctx.parts.filter(({ obj }) => obj?.userData?.kind === 'CRITTERIUM_8_ASSEMBLY').flatMap(({ obj }) => obj.userData.partsDefinition.map(({ code }) => code)).sort();
  const entities = JSON.parse(JSON.stringify(serializeProjectEntities(ctx.parts).entities));
  assert.equal(entities.filter((item) => item.kind === 'CRITTERIUM_8').length, 4);
  assert.equal(entities.filter((item) => item.kind === 'CRITTERIUM_8_SEQUENCE').length, 2);
  assert.equal(entities.filter((item) => item.kind === 'CRITERIUM_SYSTEM').length, 1);
  const next = { scene: new THREE.Scene(), parts: [], pickables: [] };
  const loadedFrames = [];
  for (const entity of entities.filter((item) => item.kind === 'CRITTERIUM_8')) {
    const instance = await createCritterium8Instance({ ...entity.config, instanceId: entity.instanceId, assemblyId: entity.assemblyId, groupId: entity.groupId, frameId: entity.frameId, transform: entity.transform });
    registerCritterium8Instance({ instance, parent: next.scene, partsRegistry: next.parts, pickables: next.pickables });
    loadedFrames.push(instance.assembly);
  }
  const loadedSequences = [];
  for (const entity of entities.filter((item) => item.kind === 'CRITTERIUM_8_SEQUENCE')) {
    loadedSequences.push(await loadPersistedEntity(entity, { createCritterium8Sequence: (value) => restoreCritterium8Sequence(value, {
      scene: next.scene, partsRegistry: next.parts, pickables: next.pickables, findFrame: (id) => loadedFrames.find((frame) => frame.userData.frameId === id),
    }) }));
  }
  const systemEntity = entities.find((item) => item.kind === 'CRITERIUM_SYSTEM');
  const restored = await loadPersistedEntity(systemEntity, { createCritteriumSystem: (value) => restoreCritteriumSystem(value, {
    scene: next.scene, partsRegistry: next.parts, findSequence: (id) => loadedSequences.find((sequence) => sequence.userData.sequenceId === id),
  }) });
  assert.equal(restored.userData.systemId, system.userData.systemId);
  assert.deepEqual(serializeCritteriumSystem(restored), systemEntity);
  assert.deepEqual(loadedSequences.map((sequence) => sequence.userData.junctionIds), ctx.sequences.map((sequence) => sequence.userData.junctionIds));
  loadedFrames.map(position).forEach((actual, index) => actual.forEach((value, axis) => assert.ok(Math.abs(value - before[index][axis]) < 1e-7)));
  assert.equal(next.parts.filter(({ obj }) => obj?.userData?.kind === 'CRITTERIUM_8_ASSEMBLY').length, 4);
  assert.equal(next.parts.filter(({ obj }) => obj?.userData?.kind === 'CRITERIUM_SYSTEM').length, 1);
  const afterCommercial = next.parts.filter(({ obj }) => obj?.userData?.kind === 'CRITTERIUM_8_ASSEMBLY').flatMap(({ obj }) => obj.userData.partsDefinition.map(({ code }) => code)).sort();
  assert.deepEqual(afterCommercial, beforeCommercial);
  const rebuilt = prepareCritterium8SequenceRebuild(loadedSequences[0]);
  assert.equal(rebuilt.success, true);
  assert.deepEqual(rebuilt.sequenceRoot.userData.junctionIds, loadedSequences[0].userData.junctionIds);
  assert.equal(HISTORY_ACTION_TYPES.CRITERIUM_SYSTEM_MOVE, 'CRITERIUM_SYSTEM_MOVE');
});

test('sistema faltante o conexión inválida falla sin consumir secuencias; proyecto antiguo queda intacto', async () => {
  const ctx = await makeScene();
  const system = createCritteriumSystemFromSequences(ctx.sequences);
  const entity = serializeCritteriumSystem(system);
  const oldEntities = serializeProjectEntities(ctx.parts).entities.filter((item) => item.kind !== 'CRITERIUM_SYSTEM');
  assert.equal(oldEntities.some((item) => item.kind === 'CRITERIUM_SYSTEM'), false);
  deleteCritteriumSystem(system, { partsRegistry: ctx.parts, parent: ctx.scene });
  const context = { scene: ctx.scene, partsRegistry: ctx.parts, findSequence: (id) => ctx.sequences.find((sequence) => sequence.userData.sequenceId === id) };
  assert.throws(() => restoreCritteriumSystem({ ...entity, sequenceIds: ['MISSING'] }, context), /MISSING_SEQUENCE/);
  assert.throws(() => restoreCritteriumSystem({ ...entity, connections: [{ sourceSequenceId: entity.sequenceIds[0], targetSequenceId: entity.sequenceIds[1], sourcePointId: 'INVALID', targetPointId: 'INVALID' }] }, context), /INVALID_CONNECTION_POINT/);
  assert.equal(ctx.sequences.every((sequence) => sequence.parent === ctx.scene), true);
  const beforeCodes = ctx.frames.flatMap((frame) => frame.userData.partsDefinition.map((part) => part.code)).sort();
  const restored = restoreCritteriumSystem(entity, context);
  const afterCodes = restored.children.flatMap((sequence) => sequence.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY').flatMap((frame) => frame.userData.partsDefinition.map((part) => part.code))).sort();
  assert.deepEqual(afterCodes, beforeCodes);
});
