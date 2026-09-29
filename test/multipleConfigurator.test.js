import test from 'node:test';
import assert from 'node:assert/strict';
import { configureMultiple } from '../src/mepal/multiple/configurator/multipleConfigurator.js';
import { MultipleComposition } from '../src/mepal/multiple/definitions/MultipleComposition.js';

test('configurador genera una composición MULTIPLE válida', () => {
  const result = configureMultiple({ widthCm: 90, heightCm: 166, thicknessCm: 8, composition: MultipleComposition.documented(166).toJSON() });
  assert.equal(result.success, true); assert.deepEqual(result.composition.slots.map((slot) => slot.heightCm), [76, 76]);
});

test('configurador rechaza una composición que excede la altura', () => {
  const composition = { frameHeightCm: 204, baseboardHeightCm: 14, slots: [0, 1, 2].map((index) => ({ slotKey: `slot-${index}`, heightCm: 76, tileType: 'FORMICA' })) };
  const result = configureMultiple({ widthCm: 90, heightCm: 204, thicknessCm: 8, composition });
  assert.equal(result.success, false); assert.equal(result.diagnostics[0].code, 'MULTIPLE_HEIGHT_EXCEEDED');
});

test('configurador genera puerta compatible como una composición paramétrica', () => {
  const result = configureMultiple({ widthCm: 90, heightCm: 166, thicknessCm: 8, door: { enabled: true, swing: 'RIGHT', material: 'FORMICA' } });
  assert.equal(result.success, true); assert.equal(result.composition.slots[0].type, 'DOOR');
});
