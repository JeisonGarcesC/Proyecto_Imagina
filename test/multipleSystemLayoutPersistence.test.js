import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleSystem } from '../src/mepal/multiple/system/MultipleSystem.js';
import { buildMultipleSystem } from '../src/mepal/multiple/system/MultipleSystemBuilder.js';
import { serializeMultipleSystem, restoreMultipleSystem } from '../src/mepal/multiple/system/multipleSystemSerialization.js';
import { duplicateMultipleSystem, moveMultipleSystem, moveMultipleModule } from '../src/mepal/multiple/system/layout/MultipleSmartLayoutEngine.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';

test('movimiento, duplicación y persistencia conservan identidad y conexiones', () => {
  const config = createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });
  const system = new MultipleSystem().addModule(config).addModule(config).layoutLinear();
  const [a, b] = system.modules;
  system.connect({ from: { moduleId: a.moduleId, point: 'END' }, to: { moduleId: b.moduleId, point: 'START' } });
  const distance = b.position.x - a.position.x;
  const originalBOM = buildMultipleSystem(system).object.userData.bom;
  moveMultipleSystem(system, { x: 1 });
  assert.ok(Math.abs(system.modules[1].position.x - system.modules[0].position.x - distance) < 1e-9);
  const duplicate = duplicateMultipleSystem(system);
  assert.notEqual(duplicate.systemId, system.systemId);
  assert.ok(duplicate.modules.every((module, index) => module.instanceId !== system.modules[index].instanceId));
  assert.equal(duplicate.connections[0].from.moduleId, duplicate.modules[0].moduleId);
  const built = buildMultipleSystem(system);
  assert.equal(built.success, true);
  assert.deepEqual(built.object.userData.bom, originalBOM);
  assert.deepEqual(buildMultipleSystem(duplicate).object.userData.bom.map(({ moduleIds, ...row }) => row), originalBOM.map(({ moduleIds, ...row }) => row));
  const restored = restoreMultipleSystem(serializeMultipleSystem(built.object));
  assert.equal(restored.success, true);
  assert.deepEqual(restored.object.userData.layout, system.layout);
  assert.equal(restored.object.userData.connections.length, 1);
});

test('mover un módulo conserva identidad y reemplaza su conexión previa al alejarlo', () => {
  const config = createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });
  const system = new MultipleSystem().addModule(config).addModule(config).layoutLinear();
  const [a, b] = system.modules;
  system.connect({ from: { moduleId: a.moduleId, point: 'END' }, to: { moduleId: b.moduleId, point: 'START' } });
  moveMultipleModule(system, b.moduleId, { x: 2 });
  assert.equal(system.connections.length, 0);
  assert.equal(system.modules[1].instanceId, b.instanceId);
});

test('agregar y eliminar módulos cambia BOM; conectar y mover no cambia cantidades', () => {
  const config = createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });
  const system = new MultipleSystem().addModule(config).addModule(config).layoutLinear();
  const quantities = (value) => buildMultipleSystem(value).object.userData.bom.map((row) => row.quantity);
  const initial = quantities(system);
  moveMultipleModule(system, system.modules[1].moduleId, { x: 0.88 });
  assert.deepEqual(quantities(system), initial);
  system.removeModule(system.modules[1].moduleId);
  assert.ok(quantities(system).every((qty, index) => qty < initial[index]));
});
