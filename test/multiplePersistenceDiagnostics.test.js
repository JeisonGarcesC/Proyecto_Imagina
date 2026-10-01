import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { serializeMultipleEntity, restoreMultipleEntity } from '../src/mepal/multiple/serialization/multipleSerialization.js';

test('restaurar compara snapshot comercial sin bloquear la carga', () => {
  const instance = createMultipleInstance({ config: { widthCm: 90, heightCm: 128, cableTray: { enabled: true, side: 'RIGHT' } } });
  const entity = serializeMultipleEntity(instance.object); const cable = entity.commercial.find((item) => item.componentKey === 'cable-tray-0');
  assert.ok(cable?.codigoPT); const currentPrice = cable.price;
  cable.codigoPT = 'CODIGO_ANTERIOR'; cable.price = currentPrice == null ? null : Number(currentPrice) + 1;
  const restored = restoreMultipleEntity(entity); assert.equal(restored.success, true);
  assert.ok(restored.diagnostics.some((item) => item.code === 'MULTIPLE_PREVIOUS_CODE_NOT_FOUND'));
  assert.ok(restored.diagnostics.some((item) => item.code === 'MULTIPLE_CODE_CHANGED'));
  if (currentPrice != null) assert.ok(restored.diagnostics.some((item) => item.code === 'MULTIPLE_PRICE_CHANGED'));
});

test('serialización rechaza componentKey duplicado', () => {
  const instance = createMultipleInstance({ config: { widthCm: 90, heightCm: 166 } });
  instance.object.userData.config.composition.slots[1].componentKey = instance.object.userData.config.composition.slots[0].componentKey;
  assert.throws(() => serializeMultipleEntity(instance.object), /MULTIPLE_DUPLICATE_COMPONENT_KEY/);
});
