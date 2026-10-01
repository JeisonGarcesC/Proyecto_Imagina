import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleSystem } from '../src/mepal/multiple/system/MultipleSystem.js';
import { validateMultipleSystem } from '../src/mepal/multiple/system/multipleSystemRules.js';
import { duplicateMultipleSystem } from '../src/mepal/multiple/system/layout/MultipleSmartLayoutEngine.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';

const config = createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });

test('A-B y B-A son una sola conexión y el diagnóstico detecta datos duplicados', () => {
  const system = new MultipleSystem().addModule(config).addModule(config).layoutLinear();
  const [a, b] = system.modules;
  const ab = { connectionId: 'ab', type: 'LINEAR', from: { moduleId: a.moduleId, point: 'END' }, to: { moduleId: b.moduleId, point: 'START' } };
  const ba = { connectionId: 'ba', type: 'LINEAR', from: { moduleId: b.moduleId, point: 'START' }, to: { moduleId: a.moduleId, point: 'END' } };
  system.connect(ab).connect(ba);
  assert.equal(system.connections.length, 1);
  const invalid = { ...system.toJSON(), connections: [ab, ba] };
  assert.ok(validateMultipleSystem(invalid).diagnostics.some((item) => item.code === 'MULTIPLE_DUPLICATE_CONNECTION'));
});

test('duplicar sistema regenera ids y conexiones sin cambiar configuración', () => {
  const system = new MultipleSystem().addModule(config).addModule(config).layoutLinear();
  const [a, b] = system.modules;
  system.connect({ from: { moduleId: a.moduleId, point: 'END' }, to: { moduleId: b.moduleId, point: 'START' } });
  const copy = duplicateMultipleSystem(system);
  assert.notEqual(copy.systemId, system.systemId);
  assert.deepEqual(copy.modules.map((module) => module.config), system.modules.map((module) => module.config));
  assert.ok(copy.modules.every((module, index) => module.moduleId !== system.modules[index].moduleId && module.instanceId !== system.modules[index].instanceId));
  assert.notEqual(copy.connections[0].connectionId, system.connections[0].connectionId);
  assert.equal(copy.connections[0].from.moduleId, copy.modules[0].moduleId);
});
