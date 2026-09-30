import test from 'node:test';
import assert from 'node:assert/strict';
import { findMultipleSnap } from '../src/mepal/multiple/system/layout/MultipleSnapEngine.js';

const module = (id, x) => ({ moduleId: id, config: { widthCm: 120, heightCm: 242, thicknessCm: 8 }, position: { x, y: 0, z: 0 }, rotation: { y: 0 } });
test('snap corrige 1.17 m a 1.20 m dentro de 50 mm y respeta desactivación', () => {
  const result = findMultipleSnap(module('b', 1.17), [module('a', 0)], { snapToleranceMm: 50 });
  assert.ok(result); assert.ok(Math.abs(result.position.x - 1.2) < 1e-9);
  assert.equal(findMultipleSnap(module('b', 1.17), [module('a', 0)], { snapEnabled: false }), null);
  assert.equal(findMultipleSnap(module('b', 1.1), [module('a', 0)], { snapToleranceMm: 50 }), null);
});
