import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMultipleCollisions } from '../src/mepal/multiple/system/layout/MultipleCollisionEngine.js';

const module = (id, x, door = false) => ({ moduleId: id, config: { widthCm: 120, heightCm: 242, thicknessCm: 8, door: { enabled: door } }, position: { x, y: 0, z: 0 }, rotation: { y: 0 } });
test('detecta solapamiento y deja libres módulos adyacentes', () => {
  assert.equal(detectMultipleCollisions([module('a', 0), module('b', 1.2)]).length, 0);
  assert.equal(detectMultipleCollisions([module('a', 0), module('b', 0.5)])[0].type, 'COLLISION_REAL');
  assert.equal(detectMultipleCollisions([module('a', 0, true), module('b', 0.5)])[0].doorBlocked, true);
  assert.equal(detectMultipleCollisions([module('a', 0), module('b', 1.21)])[0].type, 'NEAR_COLLISION');
});
