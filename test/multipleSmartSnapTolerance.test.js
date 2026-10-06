import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4 } from 'three';
import { previewMultipleSnap } from '../src/mepal/multiple/system/layout/MultipleSnapEngine.js';
import { SNAP_DISTANCE_MM } from '../src/mepal/multiple/system/layout/multipleLayoutTypes.js';

const panel = (id, x) => ({ moduleId: id, config: { widthCm: 120, heightCm: 242, thicknessCm: 8 }, position: { x, y: 0, z: 0 }, rotation: { y: 0 } });

test('captura configurada en 300 mm y acepta separaciones de 100, 250 y 299 mm', () => {
  assert.equal(SNAP_DISTANCE_MM, 300);
  for (const gapMm of [100, 250, 299]) {
    const result = previewMultipleSnap(panel('b', 1.2 + gapMm / 1000), [panel('a', 0)]);
    assert.equal(result?.status, 'GREEN', `separación ${gapMm} mm`);
    assert.ok(Math.abs(result.position.x - 1.2) < 1e-12);
  }
  assert.equal(previewMultipleSnap(panel('b', 1.501), [panel('a', 0)]), null);
});

test('sistemas anteriores con tolerancia por defecto de 50 mm usan la nueva captura', () => {
  assert.equal(previewMultipleSnap(panel('b', 1.4), [panel('a', 0)], { snapToleranceMm: 50 })?.status, 'GREEN');
  assert.equal(previewMultipleSnap(panel('b', 1.4), [panel('a', 0)], { snapDistanceMm: 50 }), null);
});

test('la distancia usa transformación mundial, incluso si el sistema está escalado', () => {
  const matrix = new Matrix4().makeScale(2, 1, 1);
  assert.equal(previewMultipleSnap(panel('b', 1.4), [panel('a', 0)], {}, { worldMatrix: matrix }), null);
  assert.equal(previewMultipleSnap(panel('b', 1.3), [panel('a', 0)], {}, { worldMatrix: matrix })?.status, 'GREEN');
});
