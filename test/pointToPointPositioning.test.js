import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapGeometry, computePointToPointPlacement, resolveSnapPoint, SNAP_TYPES } from '../src/plan2d/geometrySnap2D.js';

function anchor(part, type = SNAP_TYPES.VERTEX, index = 0) {
  return buildSnapGeometry([part]).points.filter((candidate) => candidate.type === type)[index].point;
}

for (const [name, source, target] of [
  ['horizontal', { id: 'a', x: 0, z: 0, w: 1, d: 0.5, rotY: 0 },
    { id: 'b', x: 3, z: 0, w: 2, d: 1, rotY: 0 }],
  ['vertical', { id: 'a', x: 0, z: 0, w: 1, d: 0.5, rotY: 0 },
    { id: 'b', x: 0, z: 4, w: 2, d: 1, rotY: 0 }],
  ['rotado', { id: 'a', x: -2, z: 1, w: 1.4, d: 0.7, rotY: Math.PI / 6 },
    { id: 'b', x: 3, z: -1, w: 0.9, d: 1.8, rotY: -Math.PI / 4 }],
]) {
  test(`posiciona con coincidencia geométrica exacta: ${name}`, () => {
    const origin = anchor(source);
    const destination = anchor(target, SNAP_TYPES.VERTEX, 2);
    const result = computePointToPointPlacement(origin, destination, [source]);
    const moved = { ...source, ...result.updates[0] };
    const movedOrigin = anchor(moved);
    assert.ok(Math.hypot(movedOrigin.x - destination.x, movedOrigin.z - destination.z) < 1e-10);
    assert.equal(moved.rotY, source.rotY);
    assert.equal(moved.w, source.w);
    assert.equal(moved.d, source.d);
    assert.equal(result.updates[0].id, 'a');
  });
}

test('el snap usa puntos del elemento destino y la tolerancia se adapta al zoom', () => {
  const source = { id: 'a', x: 0, z: 0, w: 1, d: 1 };
  const target = { id: 'b', x: 3, z: 2, w: 1, d: 1 };
  const geometry = buildSnapGeometry([source, target]);
  const destination = anchor(target);
  const filtered = { points: geometry.points.filter((point) => point.sourceId === 'b'), segments: [] };
  for (const scale of [50, 100, 200]) {
    const resolved = resolveSnapPoint({ worldPoint: { x: destination.x + 4 / scale, z: destination.z },
      geometry: filtered, scale, tolerancePx: 10 });
    assert.equal(resolved.snapped, true);
    assert.equal(resolved.sourceId, 'b');
    assert.deepEqual(resolved.point, destination);
  }
});

test('mueve un conjunto una sola vez y permite repetir sin modificar el destino', () => {
  const a = { id: 'a', x: 0, z: 0, w: 1, d: 1, rotY: 0.3 };
  const companion = { id: 'c', x: 1, z: 0, w: 0.5, d: 0.5, rotY: 0 };
  const b = { id: 'b', x: 4, z: 3, w: 2, d: 1, rotY: 0 };
  const origin = anchor(a);
  const destination = anchor(b);
  const result = computePointToPointPlacement(origin, destination, [a, companion]);
  assert.deepEqual(result.updates.map(({ id }) => id), ['a', 'c']);
  assert.equal(result.updates[1].x - result.updates[0].x, 1);
  assert.deepEqual(b, { id: 'b', x: 4, z: 3, w: 2, d: 1, rotY: 0 });
  assert.deepEqual(computePointToPointPlacement(origin, destination, [a, companion]), result);
  assert.equal(computePointToPointPlacement(null, destination, [a]), null);
});
