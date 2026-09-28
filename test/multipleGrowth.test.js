import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { rebuildMultipleInstance } from '../src/mepal/multiple/integration/multipleIntegration.js';

test('growth extends a 204 panel without changing its base height', () => {
  const instance = createMultipleInstance({ instanceId: 'GROWTH-1', config: { widthCm: 90, heightCm: 204, growth: { enabled: true, targetHeightCm: 280 } } });
  assert.equal(instance.success, true); assert.equal(instance.product.dimensions.baseHeightCm, 204);
  assert.equal(instance.product.dimensions.heightCm, 280);
  assert.equal(instance.object.children.find((child) => child.userData.componentKey === 'growth-0').userData.instanceId, 'GROWTH-1:component:growth-0');
});

test('growth identity survives target-height rebuild', () => {
  const instance = createMultipleInstance({ instanceId: 'GROWTH-2', config: { widthCm: 90, heightCm: 204, growth: { enabled: true, targetHeightCm: 242 } } });
  const growth = instance.object.children.find((child) => child.userData.componentKey === 'growth-0');
  assert.equal(rebuildMultipleInstance({ object: instance.object, patch: { growth: { enabled: true, targetHeightCm: 318 } } }).success, true);
  assert.equal(instance.object.children.find((child) => child.userData.componentKey === 'growth-0'), growth);
});
