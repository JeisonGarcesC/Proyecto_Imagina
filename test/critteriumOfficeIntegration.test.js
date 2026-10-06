import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { registerCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { registerCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import { serializeCritterium8Sequence, restoreCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequencePersistence.js';
import { createCritteriumSystem, registerCritteriumSystem, addSequenceToCritteriumSystem,
  connectCritteriumSystemSequences } from '../src/mepal/critterium8/system/critteriumSystem.js';
import { serializeCritteriumSystem, restoreCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystemPersistence.js';
import { resolveCritteriumConnectionPoints, reconcileCritteriumConnectionsAfterSequenceEdit,
  findCritteriumConnectionsAffectedBySequenceEdit } from '../src/mepal/critterium8/system/layout/CritteriumConnectionResolver.js';
import { layoutCritteriumLinear } from '../src/mepal/critterium8/system/layout/CritteriumLayoutEngine.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';

async function addSequence(scene, parts, pickables, system, prefix, widths, startX) {
  const frames = [];
  let cursor = startX;
  for (const [index, widthCm] of widths.entries()) {
    const instance = await createCritterium8Instance({ widthCm, heightCm: 90,
      instanceId: `${prefix}_I${index}`, frameId: `${prefix}_F${index}` });
    instance.assembly.position.x = cursor + widthCm / 200;
    cursor += widthCm / 100;
    registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
    frames.push(instance.assembly);
  }
  const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(prepared.success, true, prepared.reason);
  registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
  addSequenceToCritteriumSystem(system, prepared.sequenceRoot);
  return prepared.sequenceRoot;
}

const bom = (parts) => resolveCritterium8BOM(parts).rows
  .map(({ code, qty, sourceId, materialCode, finishCode }) => ({ code, qty, sourceId, materialCode, finishCode }))
  .sort((a, b) => `${a.sourceId}:${a.code}`.localeCompare(`${b.sourceId}:${b.code}`));

test('oficina real conserva identidades, conexiones, transformaciones y BOM al restaurar', async () => {
  const scene = new Scene(); const parts = []; const pickables = [];
  const system = createCritteriumSystem();
  registerCritteriumSystem({ system, scene, partsRegistry: parts });
  const a = await addSequence(scene, parts, pickables, system, 'OFFICE_A', [90, 90, 90], 0);
  const b = await addSequence(scene, parts, pickables, system, 'OFFICE_B', [90, 120], 4);
  const c = await addSequence(scene, parts, pickables, system, 'OFFICE_C', [90, 120], 8);
  const ids = [a, b, c].map((sequence) => sequence.userData.sequenceId);
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual([a, b, c].map((sequence) => sequence.userData.sequence.slots.length), [3, 2, 2]);
  assert.equal(new Set([a, b, c].flatMap((sequence) => sequence.userData.sequence.slots.map((slot) => slot.slotId))).size, 7);
  const aEnd = resolveCritteriumConnectionPoints(a).find((point) => point.type === 'TERMINAL_END');
  const bStart = resolveCritteriumConnectionPoints(b).find((point) => point.type === 'TERMINAL_START');
  connectCritteriumSystemSequences(system, { sourceSequenceId: ids[0], sourcePointId: aEnd.connectionId,
    targetSequenceId: ids[1], targetPointId: bStart.connectionId, type: 'RELATION' });
  const beforeLayoutBom = bom(parts);
  layoutCritteriumLinear(system, ids, { separationM: 0.05 });
  assert.deepEqual(bom(parts), beforeLayoutBom);
  system.position.set(1, 0, 2); system.updateMatrixWorld(true);
  const entities = [a, b, c].map(serializeCritterium8Sequence);
  const systemEntity = serializeCritteriumSystem(system);
  const restoredScene = new Scene(); const restoredParts = []; const restoredPickables = [];
  const frameById = new Map();
  for (const source of [a, b, c]) for (const frame of source.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY')) {
    const instance = await createCritterium8Instance({ ...frame.userData.config,
      instanceId: frame.userData.instanceId, frameId: frame.userData.frameId,
      transform: { position: frame.getWorldPosition(frame.position.clone()).toArray() } });
    registerCritterium8Instance({ instance, parent: restoredScene, partsRegistry: restoredParts, pickables: restoredPickables });
    frameById.set(frame.userData.frameId, instance.assembly);
  }
  const restoredSequences = entities.map((entity) => restoreCritterium8Sequence(entity, {
    scene: restoredScene, partsRegistry: restoredParts, pickables: restoredPickables,
    findFrame: (id) => frameById.get(id),
  }));
  const restoredSystem = restoreCritteriumSystem(systemEntity, { scene: restoredScene,
    partsRegistry: restoredParts, findSequence: (id) => restoredSequences.find((sequence) => sequence.userData.sequenceId === id) });
  assert.deepEqual(serializeCritteriumSystem(restoredSystem), systemEntity);
  assert.deepEqual(restoredSequences.map((sequence) => sequence.userData.sequence.slots.map((slot) => [slot.slotId, slot.moduleId, slot.frameId])),
    [a, b, c].map((sequence) => sequence.userData.sequence.slots.map((slot) => [slot.slotId, slot.moduleId, slot.frameId])));
  assert.deepEqual(bom(restoredParts), bom(parts));
  assert.equal(restoredParts.filter(({ obj }) => obj?.userData?.kind === 'CRITTERIUM_8_ASSEMBLY').length, 7);
});

test('al retirar un terminal se descarta su conexión; los otros extremos conservan ambas referencias', () => {
  const system = { userData: { connections: [
    { connectionId: 'C1', sourceSequenceId: 'A', sourcePointId: 'OLD_START', pointAId: 'OLD_START', targetSequenceId: 'B', targetPointId: 'B_END', pointBId: 'B_END' },
    { connectionId: 'C2', sourceSequenceId: 'A', sourcePointId: 'OLD_END', pointAId: 'OLD_END', targetSequenceId: 'C', targetPointId: 'C_START', pointBId: 'C_START' },
  ] } };
  reconcileCritteriumConnectionsAfterSequenceEdit(system, 'A', [
    { connectionId: 'OLD_START', type: 'TERMINAL_START', frameId: 'F0' },
    { connectionId: 'OLD_END', type: 'TERMINAL_END', frameId: 'F2' },
  ], [
    { connectionId: 'NEW_START', type: 'TERMINAL_START', frameId: 'F1' },
    { connectionId: 'NEW_END', type: 'TERMINAL_END', frameId: 'F2' },
  ], 'F0');
  assert.deepEqual(system.userData.connections.map((item) => item.connectionId), ['C2']);
  assert.equal(system.userData.connections[0].sourcePointId, 'NEW_END');
  assert.equal(system.userData.connections[0].pointAId, 'NEW_END');
});

test('agregar o reordenar no traslada una conexión a otro frame terminal', () => {
  const system = { userData: { connections: [
    { connectionId: 'C1', sourceSequenceId: 'A', sourcePointId: 'OLD_END', pointAId: 'OLD_END',
      targetSequenceId: 'B', targetPointId: 'B_START', pointBId: 'B_START' },
  ] } };
  reconcileCritteriumConnectionsAfterSequenceEdit(system, 'A', [
    { connectionId: 'OLD_END', type: 'TERMINAL_END', frameId: 'F1' },
  ], [
    { connectionId: 'NEW_END', type: 'TERMINAL_END', frameId: 'F2' },
  ]);
  assert.deepEqual(system.userData.connections, []);
});

test('la prevalidación impide reducir o crecer un extremo conectado sin desconectarlo', () => {
  const system = { userData: { connections: [
    { connectionId: 'C1', sourceSequenceId: 'A', sourcePointId: 'END_A', targetSequenceId: 'B', targetPointId: 'START_B' },
  ] } };
  const points = [{ connectionId: 'END_A', type: 'TERMINAL_END', frameId: 'F1' }];
  assert.equal(findCritteriumConnectionsAffectedBySequenceEdit(system, 'A', points,
    [{ frameId: 'F0' }, { frameId: 'F1' }]).length, 0);
  assert.equal(findCritteriumConnectionsAffectedBySequenceEdit(system, 'A', points,
    [{ frameId: 'F0' }, { frameId: 'F1' }, { frameId: 'F2' }]).length, 1);
  assert.equal(findCritteriumConnectionsAffectedBySequenceEdit(system, 'A', points,
    [{ frameId: 'F0' }]).length, 1);
});
