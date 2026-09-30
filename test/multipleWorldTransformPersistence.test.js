import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleSystem } from '../src/mepal/multiple/system/MultipleSystem.js';
import { buildMultipleSystem } from '../src/mepal/multiple/system/MultipleSystemBuilder.js';
import { serializeMultipleSystem, restoreMultipleSystem } from '../src/mepal/multiple/system/multipleSystemSerialization.js';
import { captureMultipleSystemSpatialState, commitMultipleProductDrag } from '../src/mepal/multiple/system/layout/MultipleSmartLayoutInteraction.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';
import { Vector3 } from 'three';

const config = createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });
const near = (a, b) => assert.ok(a.distanceTo(b) < 1e-9);

test('transformación mundo, posición local y restauración coinciden tras mover un módulo', () => {
  const built = buildMultipleSystem(new MultipleSystem().addModule(config).addModule(config).layoutLinear());
  const root = built.object;
  root.position.set(2, 0, 3);
  root.rotation.y = Math.PI / 2;
  root.updateMatrixWorld(true);
  const product = built.products[1];
  const instanceId = product.userData.instanceId;
  product.position.set(1.2, 0, 0.4);
  commitMultipleProductDrag(root, [product]);
  const worldBefore = product.getWorldPosition(new Vector3());
  const entity = serializeMultipleSystem(root);
  assert.deepEqual(entity.modules[1].position, { x: product.position.x, y: product.position.y, z: product.position.z });
  const restored = restoreMultipleSystem(entity);
  assert.equal(restored.success, true);
  near(restored.products[1].getWorldPosition(new Vector3()), worldBefore);
  assert.equal(restored.products[1].userData.instanceId, instanceId);
});

test('mover raíz conserva posiciones relativas y conexiones como una operación', () => {
  const system = new MultipleSystem().addModule(config).addModule(config).layoutLinear();
  system.connect({ from: { moduleId: system.modules[0].moduleId, point: 'END' }, to: { moduleId: system.modules[1].moduleId, point: 'START' } });
  const built = buildMultipleSystem(system);
  const root = built.object;
  const before = captureMultipleSystemSpatialState(root);
  const locals = built.products.map((product) => product.position.clone());
  const worlds = built.products.map((product) => product.getWorldPosition(new Vector3()));
  root.position.set(2, 0, 3);
  root.updateMatrixWorld(true);
  const after = captureMultipleSystemSpatialState(root);
  assert.deepEqual(after.modules, before.modules);
  assert.deepEqual(after.connections, before.connections);
  built.products.forEach((product, index) => {
    near(product.position, locals[index]);
    near(product.getWorldPosition(new Vector3()), worlds[index].add(new Vector3(2, 0, 3)));
  });
  assert.deepEqual(restoreMultipleSystem(serializeMultipleSystem(root)).object.position.toArray(), [2, 0, 3]);
});
