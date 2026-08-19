import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectSelected2DDetailKeys,
  get2DDetailKey,
  is2DDetailEnabled,
  updateDetailed2DIds,
} from '../src/plan2d/detailSelection2D.js';

test('producto simple usa instanceId estable', () => {
  assert.equal(get2DDetailKey({ instanceId: 'ARES_1', id: 'UUID_1' }), 'PART:ARES_1');
});

test('prioriza assembly y parentAssembly sobre group e instanceId', () => {
  assert.equal(
    get2DDetailKey({
      assemblyId: 'ASSEMBLY_1',
      parentAssemblyId: 'PARENT_1',
      groupId: 'GROUP_1',
      instanceId: 'PART_1',
    }),
    'ASSEMBLY:ASSEMBLY_1'
  );
  assert.equal(
    get2DDetailKey({ parentAssemblyId: 'PARENT_1', groupId: 'GROUP_1', id: 'PART_1' }),
    'ASSEMBLY:PARENT_1'
  );
});

test('dos productos permiten detallar solamente uno', () => {
  const snapshot = [
    { id: 'A', instanceId: 'A' },
    { id: 'B', instanceId: 'B' },
  ];
  const keys = collectSelected2DDetailKeys(['A'], snapshot);
  const detailed = updateDetailed2DIds(new Set(), keys, true);
  assert.equal(is2DDetailEnabled(snapshot[0], detailed), true);
  assert.equal(is2DDetailEnabled(snapshot[1], detailed), false);
});

test('multiselección agrega todas las identidades sin toggle individual', () => {
  const snapshot = [
    { id: 'A', instanceId: 'A' },
    { id: 'B', instanceId: 'B' },
    { id: 'C', instanceId: 'C' },
  ];
  const keys = collectSelected2DDetailKeys(['A', 'C'], snapshot);
  assert.deepEqual(keys, ['PART:A', 'PART:C']);
  const detailed = updateDetailed2DIds(new Set(), keys, true);
  assert.deepEqual(Array.from(detailed), ['PART:A', 'PART:C']);
});

test('Koncisa completo comparte detailKey de assembly', () => {
  const snapshot = [
    { id: 'SURFACE', parentAssemblyId: 'KONCISA_1', groupId: 'GROUP_1' },
    { id: 'COSTADO', parentAssemblyId: 'KONCISA_1', groupId: 'GROUP_1' },
    { id: 'BEAM', parentAssemblyId: 'KONCISA_1', groupId: 'GROUP_1' },
  ];
  const keys = collectSelected2DDetailKeys(['SURFACE', 'COSTADO', 'BEAM'], snapshot);
  assert.deepEqual(keys, ['ASSEMBLY:KONCISA_1']);
  const detailed = updateDetailed2DIds(new Set(), keys, true);
  assert.equal(snapshot.every((part) => is2DDetailEnabled(part, detailed)), true);
});

test('dos assemblies Koncisa permanecen independientes', () => {
  const first = { id: 'A_SURFACE', parentAssemblyId: 'KONCISA_A' };
  const second = { id: 'B_SURFACE', parentAssemblyId: 'KONCISA_B' };
  const detailed = updateDetailed2DIds(new Set(), [get2DDetailKey(first)], true);
  assert.equal(is2DDetailEnabled(first, detailed), true);
  assert.equal(is2DDetailEnabled(second, detailed), false);
});

test('desactivar y reactivar solo cambia el Set', () => {
  const key = 'PART:A';
  const enabled = updateDetailed2DIds(new Set(), [key], true);
  const disabled = updateDetailed2DIds(enabled, [key], false);
  const reenabled = updateDetailed2DIds(disabled, [key], true);
  assert.equal(enabled.has(key), true);
  assert.equal(disabled.has(key), false);
  assert.equal(reenabled.has(key), true);
});

test('escenario de 200 objetos solicita detalle únicamente para uno', () => {
  const snapshot = Array.from({ length: 200 }, (_, index) => ({
    id: `PART_${index}`,
    instanceId: `PART_${index}`,
  }));
  const keys = collectSelected2DDetailKeys(['PART_137'], snapshot);
  const detailed = updateDetailed2DIds(new Set(), keys, true);
  const requested = snapshot.filter((part) => is2DDetailEnabled(part, detailed));
  assert.equal(keys.length, 1);
  assert.equal(requested.length, 1);
  assert.equal(requested[0].id, 'PART_137');
});
