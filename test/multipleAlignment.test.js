import test from 'node:test';
import assert from 'node:assert/strict';
import { alignMultipleModules } from '../src/mepal/multiple/system/layout/MultipleAlignmentEngine.js';

test('alinea la base sin modificar los otros ejes ni el origen', () => {
  const modules = [{ moduleId: 'a', position: { x: 0, y: 0, z: 1 } }, { moduleId: 'b', position: { x: 2, y: 0.02, z: 3 } }];
  const aligned = alignMultipleModules(modules, ['a', 'b'], 'base');
  assert.equal(aligned[1].position.y, 0); assert.equal(aligned[1].position.x, 2);
  assert.equal(modules[1].position.y, 0.02);
});

test('alinea la altura superior de módulos con alturas distintas', () => {
  const modules = [{ moduleId: 'a', config: { heightCm: 242 }, position: { x: 0, y: 0, z: 0 } }, { moduleId: 'b', config: { heightCm: 318 }, position: { x: 2, y: 0, z: 0 } }];
  const aligned = alignMultipleModules(modules, ['a', 'b'], 'height');
  assert.ok(Math.abs(aligned[1].position.y + 0.76) < 1e-9);
});
