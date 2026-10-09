import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCritteriumComposition } from '../src/mepal/critterium8/ui/critteriumComposition.js';

const slot = (n) => ({ slotId: `slot-${n}`, moduleId: `module-${n}`, frameId: `frame-${n}`,
  frameInstanceId: `instance-${n}`, widthCm: 90, heightCm: 128, frameMode: 'HALF_HEIGHT', status: 'READY' });
const structure = () => ({
  systems: [{ systemId: 'system-1', sequenceIds: ['sequence-a', 'sequence-b'], connections: [
    { connectionId: 'connection-1', sourceSequenceId: 'sequence-a', targetSequenceId: 'sequence-b', type: 'LINEAR' } ] }],
  sequences: [
    { sequenceId: 'sequence-a', parentSystemId: 'system-1', slots: [slot(1), slot(2), slot(3)], diagnostics: [] },
    { sequenceId: 'sequence-b', parentSystemId: 'system-1', slots: [slot(4), slot(5)], diagnostics: [] },
  ],
});

test('composición vacía y sistema sin secuencias muestran contadores reales', () => {
  assert.deepEqual(buildCritteriumComposition({ systems: [], sequences: [] }, '' ).counts,
    { sequences: 0, modules: 0, frames: 0, connections: 0 });
  const empty = buildCritteriumComposition({ systems: [{ systemId: 'empty', sequenceIds: [], connections: [] }], sequences: [] }, 'empty');
  assert.equal(empty.systemId, 'empty');
  assert.equal(empty.counts.modules, 0);
});

test('composición deriva orden, módulos, frames y conexiones de las entidades existentes', () => {
  const source = structure();
  const model = buildCritteriumComposition(source, 'system-1');
  assert.deepEqual(model.counts, { sequences: 2, modules: 5, frames: 5, connections: 1 });
  assert.deepEqual(model.sequences.map(item => item.sequenceId), ['sequence-a', 'sequence-b']);
  assert.deepEqual(model.sequences[0].slots.map(item => item.slotId), ['slot-1', 'slot-2', 'slot-3']);
  assert.deepEqual(model.connections[0], { connectionId: 'connection-1', sourceSequenceId: 'sequence-a',
    targetSequenceId: 'sequence-b', sourceNumber: 1, targetNumber: 2, type: 'LINEAR', selected: false });
  assert.equal(model.idsUnique, true);
  assert.deepEqual(source, structure());
});

test('selección 3D resalta el módulo, su secuencia y el sistema correcto sin crear IDs', () => {
  const source = structure();
  const selectedFrame = buildCritteriumComposition(source, 'system-1', { critterium8: { instanceId: 'instance-2' },
    critterium8Sequence: { sequenceId: 'sequence-a' } });
  assert.equal(selectedFrame.sequences[0].containsSelection, true);
  assert.equal(selectedFrame.sequences[0].slots[1].selected, true);
  assert.equal(selectedFrame.sequences[1].slots.some(item => item.selected), false);
  assert.equal(buildCritteriumComposition(source, 'system-1', { critteriumSystem: { systemId: 'system-1' } }).systemSelected, true);
  assert.equal(buildCritteriumComposition(source, 'system-1', null, 'connection-1').connections[0].selected, true);
});

test('agregar, duplicar, eliminar y restaurar se reflejan al derivar de cada snapshot', () => {
  const source = structure();
  const before = buildCritteriumComposition(source, 'system-1');
  const added = structure(); added.sequences[0].slots.push(slot(6));
  const duplicate = structure(); duplicate.sequences[0].slots.splice(1, 0, slot(7));
  const removed = structure(); removed.sequences[0].slots.splice(1, 1);
  const disconnected = structure(); disconnected.systems[0].connections = [];
  assert.equal(buildCritteriumComposition(added, 'system-1').counts.modules, before.counts.modules + 1);
  assert.equal(buildCritteriumComposition(duplicate, 'system-1').idsUnique, true);
  assert.equal(buildCritteriumComposition(removed, 'system-1').counts.modules, before.counts.modules - 1);
  assert.equal(buildCritteriumComposition(disconnected, 'system-1').counts.connections, 0);
  assert.deepEqual(buildCritteriumComposition(JSON.parse(JSON.stringify(source)), 'system-1'), before);
});
