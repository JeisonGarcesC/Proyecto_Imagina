import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleComposition } from '../src/mepal/multiple/definitions/MultipleComposition.js';
import { buildMultiple } from '../src/mepal/multiple/builders/MultipleBuilder.js';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { rebuildMultipleInstance, serializeMultipleEntity, restoreMultipleEntity } from '../src/mepal/multiple/integration/multipleIntegration.js';

test('MultipleComposition owns documented panel slots', () => {
  const composition = MultipleComposition.documented(166);
  assert.equal(composition.kind, 'MULTIPLE_COMPOSITION');
  assert.deepEqual(composition.slots.map((slot) => slot.heightCm), [76, 76]);
});

test('builder creates frame, baseboard and independent tiles', () => {
  const product = buildMultiple({ widthCm: 90, heightCm: 128 });
  assert.deepEqual(product.parts.map((part) => part.componentKey), ['frame-0', 'baseboard-0', 'tile-0', 'tile-1']);
  assert.equal(product.composition.kind, 'MULTIPLE_COMPOSITION');
});

test('physical identity belongs to component groups and not meshes', () => {
  const instance = createMultipleInstance({ config: { widthCm: 90, heightCm: 90 }, instanceId: 'M-1' });
  assert.equal(instance.success, true);
  const tile = instance.object.children.find((child) => child.userData.componentKey === 'tile-0');
  assert.equal(tile.userData.instanceId, 'M-1:component:tile-0');
  assert.equal(tile.children[0].userData.instanceId, undefined);
  assert.equal(tile.userData.parentAssemblyId, 'M-1');
});

test('rebuild reconciles by componentKey and preserves identity', () => {
  const instance = createMultipleInstance({ config: { widthCm: 90, heightCm: 90 }, instanceId: 'M-2' });
  const tile = instance.object.children.find((child) => child.userData.componentKey === 'tile-0');
  const result = rebuildMultipleInstance({ object: instance.object, patch: { widthCm: 120 }, partsRegistry: [] });
  assert.equal(result.success, true);
  assert.equal(instance.object.children.find((child) => child.userData.componentKey === 'tile-0'), tile);
  assert.equal(tile.userData.instanceId, 'M-2:component:tile-0');
});

test('serialization restores parametric config and overrides', () => {
  const instance = createMultipleInstance({ config: { widthCm: 75, heightCm: 110,
    components: { 'tile-0': { finish: 'FORMICA_RED', transformOverride: { position: [0.1, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] } } } }, instanceId: 'M-3' });
  const entity = serializeMultipleEntity(instance.object); const restored = restoreMultipleEntity(entity);
  assert.equal(restored.success, true); assert.equal(restored.object.userData.config.components['tile-0'].finish, 'FORMICA_RED');
});
