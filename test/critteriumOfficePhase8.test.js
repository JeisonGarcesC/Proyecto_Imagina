import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { registerCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { registerCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import { createCritteriumSystemFromSequences, moveCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystem.js';
import { reconcileCritteriumConnectionsAfterSequenceEdit, resolveCritteriumConnectionPoints,
  findCritteriumConnectionsAffectedBySequenceEdit } from '../src/mepal/critterium8/system/layout/CritteriumConnectionResolver.js';
import { editCritteriumModuleSlots } from '../src/mepal/critterium8/composition/sequenceModuleSlots.js';
import { previewCritteriumSequenceSnap } from '../src/mepal/critterium8/system/layout/CritteriumSnapEngine.js';
import { rotateCritteriumSequence90, translateCritteriumSequence } from '../src/mepal/critterium8/system/layout/CritteriumLayoutEngine.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';
import { buildCritteriumQuotation } from '../src/mepal/critterium8/commercial/critteriumQuotation.js';
import { serializeCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystemPersistence.js';
import { describeCritteriumDiagnostic } from '../src/mepal/critterium8/ui/critteriumDiagnostics.js';

async function office() {
  const scene = new Scene(); const parts = []; const pickables = []; const sequences = [];
  for (let sequenceIndex = 0; sequenceIndex < 2; sequenceIndex += 1) {
    const frames = [];
    for (let frameIndex = 0; frameIndex < 2; frameIndex += 1) {
      const instance = await createCritterium8Instance({ widthCm: 90, heightCm: 90,
        instanceId: `P8_I${sequenceIndex}_${frameIndex}`, frameId: `P8_F${sequenceIndex}_${frameIndex}` });
      instance.assembly.position.x = 0.45 + frameIndex * 0.9;
      registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
      frames.push(instance.assembly);
    }
    const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
    assert.equal(prepared.success, true);
    registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
    sequences.push(prepared.sequenceRoot);
  }
  return { system: createCritteriumSystemFromSequences(sequences), sequences, parts };
}

test('edición de slots conectados rechaza reconciliación que perdería una conexión sin mutar el sistema', () => {
  const connection = { connectionId: 'C1', sourceSequenceId: 'A', sourcePointId: 'END_A', targetSequenceId: 'B', targetPointId: 'START_B' };
  const system = { userData: { connections: [connection] } };
  const oldPoints = [{ connectionId: 'END_A', type: 'TERMINAL_END', frameId: 'F1' }];
  assert.equal(findCritteriumConnectionsAffectedBySequenceEdit(system, 'A', oldPoints,
    [{ frameId: 'F0' }, { frameId: 'F2' }]).length, 1);
  assert.throws(() => reconcileCritteriumConnectionsAfterSequenceEdit(system, 'A', oldPoints,
    [{ connectionId: 'NEW_END', type: 'TERMINAL_END', frameId: 'F2' }], null, { rejectAffected: true }),
  /Desconecte primero el extremo afectado/);
  assert.deepEqual(system.userData.connections, [connection]);
});

test('oficina física conserva identidad, BOM y cotización al mover sistema y rotar secuencia', async () => {
  const { system, sequences, parts } = await office();
  const before = resolveCritterium8BOM(parts);
  const prices = { source: 'fixture', currency: 'COP', entries: new Map(before.rows.map((row) =>
    [row.code, { unitPrice: 100, source: 'fixture' }])) };
  const quote = () => buildCritteriumQuotation({ systemId: system.userData.systemId, bom: resolveCritterium8BOM(parts), priceCatalog: prices });
  const first = quote();
  const ids = sequences.map((sequence) => sequence.userData.sequenceId);
  const relative = sequences[1].position.clone().sub(sequences[0].position).toArray();
  moveCritteriumSystem(system, { x: 2, z: 3 });
  assert.deepEqual(sequences[1].position.clone().sub(sequences[0].position).toArray(), relative);
  rotateCritteriumSequence90(sequences[0]);
  assert.deepEqual(resolveCritterium8BOM(parts), before);
  assert.deepEqual(quote().items.map((item) => [item.code, item.quantity, item.subtotal]),
    first.items.map((item) => [item.code, item.quantity, item.subtotal]));
  assert.deepEqual(serializeCritteriumSystem(system).sequenceIds, ids);
  assert.equal(new Set(sequences.flatMap((sequence) => sequence.userData.sequence.slots.map((slot) => slot.slotId))).size, 4);
});

test('Smart Snap conserva identidad y tolerancia; diagnóstico de slots distingue extremo afectado', async () => {
  const { system, sequences } = await office();
  translateCritteriumSequence(sequences[1], [1.9, 0, 0]);
  const preview = previewCritteriumSequenceSnap(system, sequences[1]);
  assert.equal(preview?.status, 'GREEN');
  assert.ok(preview.originWorld && preview.destinationWorld && preview.finalPositionWorld);
  const beforeId = sequences[1].userData.sequenceId;
  translateCritteriumSequence(sequences[1], preview.deltaWorld);
  assert.equal(sequences[1].userData.sequenceId, beforeId);
  const points = resolveCritteriumConnectionPoints(sequences[1]);
  assert.equal(points.length, 2);
  const original = sequences[1].userData.sequence;
  const next = editCritteriumModuleSlots(original, 'ADD', { frameId: 'P8_NEW', moduleId: 'P8_M_NEW', slotIdNew: 'P8_S_NEW' });
  assert.equal(new Set(next.slots.map((slot) => slot.slotId)).size, 3);
  assert.equal(new Set(next.slots.map((slot) => slot.frameId)).size, 3);
  assert.equal(original.slots.length, 2);
  assert.match(describeCritteriumDiagnostic('INCOMPATIBLE_DIMENSIONS'), /altura/);
  assert.match(describeCritteriumDiagnostic('CODE_WITHOUT_PRICE'), /total es parcial/);
});
