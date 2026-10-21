import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDimensionAxisAssist } from '../src/plan2d/geometrySnap2D.js';
import { createDimension2D, DIMENSION_TYPES } from '../src/plan2d/dimension2D.js';

const start = { x: 0, z: 0 };
const unsnapped = (x, z) => ({ snapped: false, point: { x, z }, sourceId: null });

test('la cota toma horizontal y vertical con pequeños errores del cursor', () => {
  const horizontal = resolveDimensionAxisAssist(start, unsnapped(2, 0.08), 100);
  assert.deepEqual(horizontal.point, { x: 2, z: 0 });
  assert.equal(horizontal.axis, 'HORIZONTAL');
  const vertical = resolveDimensionAxisAssist(start, unsnapped(-0.07, -2), 100);
  assert.deepEqual(vertical.point, { x: 0, z: -2 });
  assert.equal(vertical.axis, 'VERTICAL');
  const dimension = createDimension2D({ type: DIMENSION_TYPES.LINEAR_HORIZONTAL,
    startPoint: start, endPoint: horizontal.point });
  assert.equal(dimension.value, 2);
  assert.equal(dimension.type, DIMENSION_TYPES.LINEAR_HORIZONTAL);
});

test('diagonales, desplazamientos grandes y trazos muy cortos permanecen libres', () => {
  for (const point of [unsnapped(2, 1), unsnapped(5, 0.3), unsnapped(0.05, 0.02)]) {
    const result = resolveDimensionAxisAssist(start, point, 100);
    assert.deepEqual(result.point, point.point);
    assert.equal(result.axis, null);
  }
});

test('un punto detectado por el snap geométrico conserva su posición y referencia', () => {
  const geometric = { snapped: true, point: { x: 2, z: 0.08 }, sourceId: 'mesa-1',
    feature: { kind: 'ENDPOINT', index: 0 } };
  const result = resolveDimensionAxisAssist(start, geometric, 100);
  assert.deepEqual(result.point, geometric.point);
  assert.equal(result.sourceId, 'mesa-1');
  assert.equal(result.axis, null);
});

test('la tolerancia se mide en pantalla y responde al zoom', () => {
  const point = unsnapped(2, 0.08);
  assert.equal(resolveDimensionAxisAssist(start, point, 100).axis, 'HORIZONTAL');
  assert.equal(resolveDimensionAxisAssist(start, point, 300).axis, null);
});
