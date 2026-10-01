import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleSystem } from '../src/mepal/multiple/system/MultipleSystem.js';
import { buildMultipleSystem } from '../src/mepal/multiple/system/MultipleSystemBuilder.js';
import { previewMultipleProductDrag, commitMultipleProductDrag } from '../src/mepal/multiple/system/layout/MultipleSmartLayoutInteraction.js';
import { previewMultipleSnap } from '../src/mepal/multiple/system/layout/MultipleSnapEngine.js';
import { detectMultipleCollisions } from '../src/mepal/multiple/system/layout/MultipleCollisionEngine.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';

const config = createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });

test('preview no altera estado; soltar aplica snap y conserva identidad con un solo snapshot', () => {
  const built = buildMultipleSystem(new MultipleSystem().addModule(config).addModule(config).layoutLinear());
  const [first, second] = built.products;
  const id = second.userData.instanceId;
  const moduleId = second.userData.moduleId;
  second.position.x = 0.88;
  const beforeJSON = JSON.stringify(built.object.userData.modules);
  const preview = previewMultipleProductDrag(second);
  assert.equal(preview.status, 'GREEN');
  assert.equal(JSON.stringify(built.object.userData.modules), beforeJSON);
  const result = commitMultipleProductDrag(built.object, [second]);
  assert.equal(result.changed, true);
  assert.equal(second.position.x, 0.9);
  assert.equal(second.userData.instanceId, id);
  assert.equal(second.userData.moduleId, moduleId);
  assert.equal(built.object.userData.connections.length, 1);
  assert.equal(result.before.connections.length, 0);
  assert.equal(result.after.connections.length, 1);
  assert.equal(first.position.x, 0);
});

test('snap informa verde, amarillo y rojo; contacto es válido y penetración real es error', () => {
  const a = { moduleId: 'a', config: { widthCm: 90, heightCm: 90, thicknessCm: 8 }, position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } };
  const b = { ...a, moduleId: 'b', position: { x: 0.88, y: 0, z: 0 } };
  assert.equal(previewMultipleSnap(b, [a]).status, 'GREEN');
  assert.equal(previewMultipleSnap({ ...b, position: { ...b.position, x: 0.81 } }, [a]).status, 'YELLOW');
  assert.equal(previewMultipleSnap({ ...b, rotation: { y: Math.PI / 2 } }, [a]).status, 'RED');
  assert.equal(detectMultipleCollisions([a, { ...b, position: { ...b.position, x: 0.9 } }]).length, 0);
  assert.equal(detectMultipleCollisions([a, { ...b, position: { ...b.position, x: 0.5 } }])[0].type, 'COLLISION_REAL');
});
