import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMultipleComposition } from '../src/mepal/multiple/rules/multipleCompositionRules.js';

test('reglas distinguen composición incompleta y excedida', () => {
  const base = { widthCm: 90, heightCm: 90, frameMode: 'HALF_HEIGHT' };
  const incomplete = validateMultipleComposition(base, { baseboardHeightCm: 14, slots: [{ heightCm: 20, tileType: 'FORMICA' }] });
  assert.equal(incomplete.diagnostics[0].code, 'MULTIPLE_HEIGHT_INCOMPLETE');
  const exceeded = validateMultipleComposition(base, { baseboardHeightCm: 14, slots: [{ heightCm: 76, tileType: 'FORMICA' }, { heightCm: 20, tileType: 'FORMICA' }] });
  assert.equal(exceeded.diagnostics.at(-1).code, 'MULTIPLE_HEIGHT_EXCEEDED');
});

test('reglas validan material y crecimiento', () => {
  const result = validateMultipleComposition({ widthCm: 90, heightCm: 90, frameMode: 'HALF_HEIGHT', growth: { enabled: true, targetHeightCm: 242 } }, { baseboardHeightCm: 14, slots: [{ heightCm: 76, tileType: 'WOOD' }] });
  assert.ok(result.diagnostics.some((item) => item.code === 'MULTIPLE_MATERIAL_NOT_SUPPORTED'));
  assert.ok(result.diagnostics.some((item) => item.code === 'MULTIPLE_GROWTH_INCOMPATIBLE'));
});
