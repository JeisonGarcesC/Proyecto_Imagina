import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMultiple } from '../src/mepal/multiple/builders/MultipleBuilder.js';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { rebuildMultipleInstance } from '../src/mepal/multiple/integration/multipleIntegration.js';

test('door occupies the MultipleComposition and is split into physical parts', () => {
  const product = buildMultiple({ widthCm: 90, heightCm: 166, door: { enabled: true, swing: 'LEFT', material: 'GLASS' } });
  assert.equal(product.composition.slots[0].type, 'DOOR');
  assert.deepEqual(product.parts.filter((part) => part.componentRole.startsWith('DOOR_')).map((part) => part.componentRole),
    ['DOOR_FRAME_LEFT', 'DOOR_FRAME_RIGHT', 'DOOR_FRAME_TOP', 'DOOR_LEAF', 'DOOR_HINGES', 'DOOR_HARDWARE']);
  assert.equal(product.parts.find((part) => part.componentRole === 'DOOR_FRAME_LEFT').commercial.code, '22191400080');
});

test('door component identity survives rebuild', () => {
  const instance = createMultipleInstance({ instanceId: 'DOOR-1', config: { widthCm: 90, heightCm: 166, door: { enabled: true, swing: 'LEFT', material: 'GLASS' } } });
  const leaf = instance.object.children.find((child) => child.userData.componentRole === 'DOOR_LEAF');
  const result = rebuildMultipleInstance({ object: instance.object, patch: { door: { enabled: true, swing: 'RIGHT', material: 'GLASS' } } });
  assert.equal(result.success, true); assert.equal(instance.object.children.find((child) => child.userData.componentRole === 'DOOR_LEAF'), leaf);
  assert.equal(leaf.userData.instanceId, 'DOOR-1:component:door-0-leaf');
});
