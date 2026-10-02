import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';
import { commitMultipleStandardSnap, getMultipleStandardConnections } from '../src/mepal/multiple/connections/multipleStandardSnap.js';
import { serializeMultipleEntity, restoreMultipleEntity } from '../src/mepal/multiple/serialization/multipleSerialization.js';

const product = (id, widthCm, x) => {
  const result = createMultipleInstance({ config: createMultipleConfigurationState({ widthCm, heightCm: 90, thicknessCm: 8 }), instanceId: id });
  assert.equal(result.success, true, result.reason);
  result.object.position.x = x;
  return result.object;
};

for (const [firstWidth, secondWidth] of [[120, 120], [120, 150], [150, 120]]) {
  test(`dos estándares ${firstWidth} + ${secondWidth} guardan una conexión lógica`, () => {
    const idealCenter = (firstWidth + secondWidth) / 200;
    const a = product('a', firstWidth, 0); const b = product('b', secondWidth, idealCenter + 0.2);
    const scene = new Group(); scene.add(a, b);
    const beforeBOM = JSON.stringify([a.userData.bom, b.userData.bom]);
    const result = commitMultipleStandardSnap(b, [a, b]);
    assert.equal(result.connection?.type, 'LINEAR');
    assert.ok(Math.abs(b.position.x - idealCenter) < 1e-12);
    assert.equal(getMultipleStandardConnections([a, b]).length, 1);
    assert.equal(JSON.stringify([a.userData.bom, b.userData.bom]), beforeBOM);
    commitMultipleStandardSnap(a, [a, b]);
    assert.equal(getMultipleStandardConnections([a, b]).length, 1);
    const saved = [serializeMultipleEntity(a), serializeMultipleEntity(b)];
    const restored = saved.map((entity) => restoreMultipleEntity(entity).object);
    assert.equal(getMultipleStandardConnections(restored).length, 1);
    assert.equal(restored[0].userData.instanceId, 'a');
    assert.equal(restored[1].userData.instanceId, 'b');
    b.position.x = idealCenter + 1;
    commitMultipleStandardSnap(b, [a, b]);
    assert.equal(getMultipleStandardConnections([a, b]).length, 0);
  });
}
