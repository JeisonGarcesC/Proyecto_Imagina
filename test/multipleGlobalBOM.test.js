import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { emitMultipleGlobalBOM } from '../src/mepal/multiple/integration/multipleGlobalBOM.js';

test('BOM global consume exclusivamente el BOM de la raíz MULTIPLE', () => {
  const instance = createMultipleInstance({ config: { widthCm: 90, heightCm: 90 }, instanceId: 'GLOBAL-MULTIPLE' });
  const calls = []; const handled = emitMultipleGlobalBOM(instance.object, (...args) => calls.push(args), (_code, description) => description);
  assert.equal(handled, true); assert.equal(calls.length, instance.object.userData.bom.length);
  assert.ok(calls.every((call) => call[8] === 'GLOBAL-MULTIPLE'));
  assert.equal(emitMultipleGlobalBOM(instance.object.children[0], () => assert.fail('No debe emitir hijos')), false);
});

test('BOM global conserva cantidad y precio de los descriptores MULTIPLE', () => {
  const object = { userData: { kind: 'MULTIPLE_PRODUCT', instanceId: 'M', groupId: 'G', groupName: 'Multiple', bom: [{ code: '100', description: 'Pieza', quantity: 2, price: 500 }] } };
  const calls = []; emitMultipleGlobalBOM(object, (...args) => calls.push(args));
  assert.equal(calls[0][0], '100'); assert.equal(calls[0][1], 2); assert.equal(calls[0][3], 500);
});
