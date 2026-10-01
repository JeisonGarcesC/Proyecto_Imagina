import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleSystem } from '../src/mepal/multiple/system/MultipleSystem.js';
import { buildMultipleSystem } from '../src/mepal/multiple/system/MultipleSystemBuilder.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';

const config = (widthCm = 90) => createMultipleConfigurationState({ widthCm, heightCm: 90, thicknessCm: 8 });

test('crea un sistema compuesto por MULTIPLE_PRODUCT con identidad independiente', () => {
  const system = new MultipleSystem().addModule(config()).addModule(config(120)).layoutLinear();
  const built = buildMultipleSystem(system);
  assert.equal(built.success, true); assert.equal(built.object.userData.kind, 'MULTIPLE_SYSTEM');
  assert.equal(built.products.length, 2); assert.ok(built.products.every((product) => product.userData.kind === 'MULTIPLE_PRODUCT'));
  assert.equal(new Set(built.products.map((product) => product.userData.instanceId)).size, 2);
});

test('duplicar conserva configuración y genera moduleId e instanceId nuevos', () => {
  const system = new MultipleSystem().addModule(config()); const source = system.modules[0]; const duplicate = system.duplicateModule(source.moduleId);
  assert.deepEqual(duplicate.config, source.config); assert.notEqual(duplicate.moduleId, source.moduleId); assert.notEqual(duplicate.instanceId, source.instanceId);
});

test('conexiones validan altura espesor y orientación', () => {
  const system = new MultipleSystem().addModule(config()).addModule(config()).layoutLinear(); const [from, to] = system.modules;
  system.connect({ type: 'LINEAR', from: { moduleId: from.moduleId, point: 'END' }, to: { moduleId: to.moduleId, point: 'START' } });
  assert.equal(system.validate().valid, true);
  system.updateModule(to.moduleId, { config: createMultipleConfigurationState({ widthCm: 90, heightCm: 128, thicknessCm: 8 }) });
  assert.ok(system.validate().diagnostics.some((item) => item.code === 'MULTIPLE_SYSTEM_CONNECTION_HEIGHT_MISMATCH'));
});
