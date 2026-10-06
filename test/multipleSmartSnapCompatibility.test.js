import test from 'node:test';
import assert from 'node:assert/strict';
import { getMultipleConnectionPoints, resolveMultipleConnection } from '../src/mepal/multiple/system/layout/MultipleConnectionResolver.js';
import { previewMultipleSnap, findMultipleSnap } from '../src/mepal/multiple/system/layout/MultipleSnapEngine.js';

const panel = (id, x, patch = {}) => ({ moduleId: id, config: { widthCm: 120, heightCm: 242, thicknessCm: 8, ...patch.config }, position: { x, y: 0, z: patch.z || 0 }, rotation: { y: patch.rotation || 0 } });

test('altura y espesor comerciales incompatibles impiden snap y explican el motivo', () => {
  const a = panel('a', 0);
  const height = panel('b', 1.3, { config: { heightCm: 280 } });
  const thickness = panel('b', 1.3, { config: { thicknessCm: 10 } });
  assert.equal(previewMultipleSnap(height, [a]).reason, 'MULTIPLE_SNAP_HEIGHT_MISMATCH');
  assert.equal(previewMultipleSnap(thickness, [a]).reason, 'MULTIPLE_SNAP_THICKNESS_MISMATCH');
  assert.equal(findMultipleSnap(height, [a]), null);
  assert.equal(findMultipleSnap(thickness, [a]), null);
});

test('rotación de 90 grados no conecta automáticamente', () => {
  const a = panel('a', 0);
  const rotated = panel('b', 0.6, { rotation: Math.PI / 2, z: -0.6 });
  assert.equal(previewMultipleSnap(rotated, [a]).reason, 'MULTIPLE_SNAP_ORIENTATION_MISMATCH');
  assert.equal(findMultipleSnap(rotated, [a]), null);
});

test('END-START es compatible y END-END no lo es', () => {
  const a = panel('a', 0);
  const b = panel('b', 1.2);
  const points = getMultipleConnectionPoints(a);
  assert.deepEqual(points.find((point) => point.id === 'END').direction, [1, 0, 0]);
  assert.deepEqual(points.find((point) => point.id === 'START').direction, [-1, 0, 0]);
  assert.ok(resolveMultipleConnection(a, 'END', b, 'START'));
  assert.equal(resolveMultipleConnection(a, 'END', b, 'END'), null);
});
