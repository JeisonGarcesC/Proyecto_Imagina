import test from 'node:test';
import assert from 'node:assert/strict';
import { getMultipleConnectionPoints, resolveMultipleConnection } from '../src/mepal/multiple/system/layout/MultipleConnectionResolver.js';
import { getMultipleLayoutDiagnostics } from '../src/mepal/multiple/system/layout/multipleLayoutDiagnostics.js';

test('conecta extremos compatibles con puntos lógicos', () => {
  const a = { moduleId: 'a', config: { widthCm: 120, thicknessCm: 8 }, position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } };
  const b = { ...a, moduleId: 'b', position: { x: 1.17, y: 0, z: 0 } };
  assert.equal(getMultipleConnectionPoints(a).find((point) => point.id === 'END').position[0], 0.6);
  assert.deepEqual(resolveMultipleConnection(a, 'END', b, 'START').offset, [0.030000000000000027, 0, 0]);
  assert.equal(resolveMultipleConnection(a, 'START', b, 'START'), null);
});

test('diferencias comerciales y conexión inválida quedan como advertencias', () => {
  const a = { moduleId: 'a', config: { widthCm: 120, heightCm: 242, thicknessCm: 8 }, position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } };
  const b = { moduleId: 'b', config: { widthCm: 120, heightCm: 318, thicknessCm: 10 }, position: { x: 1.2, y: 0, z: 0 }, rotation: { y: 0 } };
  const codes = getMultipleLayoutDiagnostics([a, b], [{ connectionId: 'c', from: { moduleId: 'a', point: 'START' }, to: { moduleId: 'b', point: 'START' } }]).map((item) => item.code);
  assert.ok(codes.includes('MULTIPLE_HEIGHT_MISMATCH'));
  assert.ok(codes.includes('MULTIPLE_THICKNESS_MISMATCH'));
  assert.ok(codes.includes('MULTIPLE_INVALID_CONNECTION'));
});
