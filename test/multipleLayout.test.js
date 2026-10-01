import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleSystem } from '../src/mepal/multiple/system/MultipleSystem.js';
import { findMultipleSystemOverlaps } from '../src/mepal/multiple/system/MultipleLayoutEngine.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';

const config = (widthCm) => createMultipleConfigurationState({ widthCm, heightCm: 90, thicknessCm: 8 });
test('layout lineal ubica el siguiente módulo después del ancho anterior', () => {
  const system = new MultipleSystem().addModule(config(120)).addModule(config(90)).layoutLinear();
  assert.equal(system.modules[0].position.x, 0); assert.ok(Math.abs(system.modules[1].position.x - 1.05) < 1e-12);
  assert.deepEqual(findMultipleSystemOverlaps(system.modules), []);
});

test('detecta solapamientos entre módulos paralelos', () => {
  const system = new MultipleSystem().addModule(config(120)).addModule(config(90));
  assert.equal(findMultipleSystemOverlaps(system.modules).length, 1);
});
