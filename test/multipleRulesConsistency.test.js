import test from 'node:test';
import assert from 'node:assert/strict';
import { configureMultiple } from '../src/mepal/multiple/configurator/multipleConfigurator.js';
import { buildMultiple } from '../src/mepal/multiple/builders/MultipleBuilder.js';
import { createMultipleConfigurationState, removeMultipleConfigurationSlot } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';

const builderAccepts = (config) => { try { buildMultiple(config); return true; } catch { return false; } };
test('configurador y builder aceptan y rechazan las mismas configuraciones', () => {
  const valid = { widthCm: 90, heightCm: 90, thicknessCm: 8 };
  assert.equal(configureMultiple(valid).success, builderAccepts(valid));
  for (const invalid of [{ ...valid, widthCm: 91 }, { ...valid, thicknessCm: 9 }, { ...valid, frameMode: 'UNKNOWN' }]) assert.equal(configureMultiple(invalid).success, builderAccepts(invalid));
});

test('claves duplicadas se rechazan antes de construir', () => {
  const composition = { frameHeightCm: 166, baseboardHeightCm: 14, slots: [
    { slotKey: 'same', componentKey: 'same', heightCm: 76, tileType: 'FORMICA' },
    { slotKey: 'same', componentKey: 'same', heightCm: 76, tileType: 'FORMICA' },
  ] };
  const configured = configureMultiple({ widthCm: 90, heightCm: 166, thicknessCm: 8, composition });
  assert.equal(configured.success, false); assert.ok(configured.diagnostics.some((item) => item.code === 'MULTIPLE_DUPLICATE_COMPONENT_KEY'));
  assert.throws(() => buildMultiple({ widthCm: 90, heightCm: 166, composition }), /MULTIPLE_DUPLICATE_COMPONENT_KEY/);
});

test('eliminar un slot elimina también sus acabados y transformaciones', () => {
  const state = createMultipleConfigurationState({ widthCm: 90, heightCm: 166, components: { 'tile-0': { finish: 'FORMICA_RED' }, 'tile-1': { transformOverride: { position: [1, 0, 0] } } } });
  const cleaned = removeMultipleConfigurationSlot(state, 'tile-1');
  assert.equal(cleaned.components['tile-1'], undefined); assert.equal(cleaned.composition.slots.some((slot) => slot.componentKey === 'tile-1'), false);
});
