import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleSystem } from '../src/mepal/multiple/system/MultipleSystem.js';
import { buildMultipleSystem } from '../src/mepal/multiple/system/MultipleSystemBuilder.js';
import { serializeMultipleSystem, restoreMultipleSystem } from '../src/mepal/multiple/system/multipleSystemSerialization.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';

test('guardar y restaurar conserva sistema módulos conexiones y transformaciones', () => {
  const config = createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });
  const system = new MultipleSystem().addModule(config).addModule(config).layoutLinear(); const [a, b] = system.modules;
  system.connect({ type: 'LINEAR', from: { moduleId: a.moduleId, point: 'END' }, to: { moduleId: b.moduleId, point: 'START' } });
  const built = buildMultipleSystem(system); built.object.position.set(2, 0, 3);
  built.products[1].position.set(4.2, 0, -1);
  const entity = serializeMultipleSystem(built.object); const restored = restoreMultipleSystem(entity);
  assert.equal(restored.success, true); assert.equal(restored.object.userData.systemId, system.systemId);
  assert.deepEqual(restored.object.position.toArray(), [2, 0, 3]); assert.deepEqual(restored.object.userData.connections, system.connections);
  assert.deepEqual(restored.products.map((product) => product.userData.instanceId), system.modules.map((module) => module.instanceId));
  assert.deepEqual(restored.products[1].position.toArray(), [4.2, 0, -1]);
});

test('persistencia global guarda una sola entidad de sistema y omite productos hijos', async () => {
  const config = createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });
  const built = buildMultipleSystem(new MultipleSystem().addModule(config).addModule(config).layoutLinear());
  const parts = [{ obj: built.object }, ...built.products.map((obj) => ({ obj }))];
  const serialized = serializeProjectEntities(parts);
  assert.equal(serialized.entities.length, 1); assert.equal(serialized.entities[0].kind, 'MULTIPLE_SYSTEM');
  const loaded = await loadPersistedEntity(serialized.entities[0], { createMultipleSystem: (entity) => restoreMultipleSystem(entity).object });
  assert.equal(loaded.userData.kind, 'MULTIPLE_SYSTEM'); assert.equal(loaded.children.length, 2);
});
