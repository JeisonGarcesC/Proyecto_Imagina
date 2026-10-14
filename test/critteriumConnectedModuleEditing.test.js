import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeCritteriumBlockedSequenceEdit,
  findCritteriumConnectionsAffectedBySequenceEdit,
} from '../src/mepal/critterium8/system/layout/CritteriumConnectionResolver.js';
import { editCritteriumModuleSlots } from '../src/mepal/critterium8/composition/sequenceModuleSlots.js';

const sequence = {
  id: 'A',
  slots: ['A', 'B', 'C'].map((name, index) => ({
    slotId: name, moduleId: `module-${name}`, frameId: `frame-${name}`,
    position: [0.45 + index * 0.9, 0, 0], orientation: 0, widthCm: 90, depthCm: 8,
  })),
};
const point = { connectionId: 'point-C', type: 'TERMINAL_END', frameId: 'frame-C', slotId: 'C' };
const system = { userData: { connections: [{
  connectionId: 'connection-1', sourceSequenceId: 'A', sourcePointId: 'point-C',
  targetSequenceId: 'B', targetPointId: 'point-B', type: 'LINEAR',
}] } };
const edit = (operation, args = {}) => editCritteriumModuleSlots(sequence, operation, {
  frameId: 'frame-X', moduleId: 'module-X', slotIdNew: 'X', ...args,
});
const affected = (slots) => findCritteriumConnectionsAffectedBySequenceEdit(system, 'A', [point], slots);

test('agregar tras el extremo conectado conserva IDs de C pero deja de ser terminal y se bloquea', () => {
  const next = edit('ADD');
  assert.deepEqual(next.slots.map((slot) => slot.frameId), ['frame-A', 'frame-B', 'frame-C', 'frame-X']);
  assert.equal(next.slots[2].slotId, 'C');
  assert.equal(affected(next.slots)[0].connectionId, 'connection-1');
  const reason = describeCritteriumBlockedSequenceEdit(system, 'A', 'ADD', [point], next.slots);
  assert.match(reason, /extremo final/);
  assert.match(reason, /frame-C/);
  assert.match(reason, /connection-1/);
  assert.match(reason, /Desconecte primero/);
});

test('insertar o duplicar después de C no reasigna la conexión al frame nuevo', () => {
  const inserted = edit('INSERT', { index: 3 });
  const duplicated = edit('DUPLICATE', { slotId: 'C' });
  for (const next of [inserted, duplicated]) {
    assert.equal(affected(next.slots).length, 1);
    assert.equal(next.slots.at(-1).frameId, 'frame-X');
    assert.notEqual(next.slots.at(-1).moduleId, 'module-C');
    assert.notEqual(next.slots.at(-1).slotId, 'C');
  }
});

test('eliminar o reordenar C no transfiere la conexión al vecino', () => {
  for (const next of [edit('REMOVE', { slotId: 'C' }), edit('REORDER', { slotId: 'C', index: 0 })]) {
    assert.equal(affected(next.slots).length, 1);
    assert.equal(next.slots.at(-1).frameId !== 'frame-C', true);
  }
});

test('insertar antes de C o eliminar B conserva el mismo frame terminal para validación espacial posterior', () => {
  const inserted = edit('INSERT', { index: 2 });
  const removed = edit('REMOVE', { slotId: 'B' });
  for (const next of [inserted, removed]) {
    assert.equal(affected(next.slots).length, 0);
    assert.equal(next.slots.at(-1).frameId, 'frame-C');
    assert.equal(next.slots.at(-1).slotId, 'C');
    assert.equal(next.slots.at(-1).moduleId, 'module-C');
  }
  assert.notDeepEqual(inserted.slots.at(-1).position, sequence.slots.at(-1).position);
  assert.notDeepEqual(removed.slots.at(-1).position, sequence.slots.at(-1).position);
});

test('editar el extremo opuesto permite crecer si el frame conectado sigue siendo terminal', () => {
  const startPoint = { connectionId: 'point-A', type: 'TERMINAL_START', frameId: 'frame-A', slotId: 'A' };
  const startSystem = { userData: { connections: [{
    connectionId: 'connection-start', sourceSequenceId: 'A', sourcePointId: 'point-A',
    targetSequenceId: 'B', targetPointId: 'point-B', type: 'LINEAR',
  }] } };
  const next = edit('ADD');
  assert.equal(findCritteriumConnectionsAffectedBySequenceEdit(startSystem, 'A', [startPoint], next.slots).length, 0);
  assert.equal(describeCritteriumBlockedSequenceEdit(startSystem, 'A', 'ADD', [startPoint], next.slots), null);
  assert.equal(next.slots[0].frameId, 'frame-A');
  assert.deepEqual(next.slots[0].position, sequence.slots[0].position);
});
