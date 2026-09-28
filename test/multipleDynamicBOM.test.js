import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { rebuildMultipleInstance } from '../src/mepal/multiple/integration/multipleIntegration.js';
import { serializeMultipleEntity, restoreMultipleEntity } from '../src/mepal/multiple/serialization/multipleSerialization.js';
import { createMultipleQuotation } from '../src/mepal/multiple/quotation/multipleQuotation.js';

test('cambiar una baldosa actualiza BOM y conserva identidad física', () => {
  const instance = createMultipleInstance({ config: { widthCm: 90, heightCm: 90 }, instanceId: 'MULTIPLE-DYNAMIC' });
  const tile = instance.object.children.find((item) => item.userData.componentKey === 'tile-0');
  const composition = structuredClone(instance.object.userData.config.composition); composition.slots[0].tileType = 'GLASS';
  const rebuilt = rebuildMultipleInstance({ object: instance.object, patch: { composition }, partsRegistry: [] });
  assert.equal(rebuilt.success, true); assert.equal(instance.object.children.find((item) => item.userData.componentKey === 'tile-0'), tile);
  assert.equal(tile.userData.materialRole, 'GLASS'); assert.ok(instance.object.userData.bom.some((row) => row.material === 'GLASS'));
});

test('composición dinámica persiste y prepara cotización sin recorrer meshes', () => {
  const instance = createMultipleInstance({ config: { widthCm: 90, heightCm: 90 } });
  const entity = serializeMultipleEntity(instance.object); const restored = restoreMultipleEntity(entity);
  assert.equal(restored.success, true); assert.deepEqual(restored.object.userData.composition.slots.map((slot) => slot.componentKey), entity.composition.slots.map((slot) => slot.componentKey));
  const quotation = createMultipleQuotation(restored.product);
  assert.equal(quotation.product, 'MULTIPLE'); assert.ok(quotation.components.length > 0); assert.equal(typeof quotation.total, 'number');
});
