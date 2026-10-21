import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWallAngularSnap, WALL_ANGLE_MIN_DISTANCE_PX, WALL_ANGLE_TOLERANCE_RAD } from '../src/core/architecture/walls/wallAngularSnap.js';
import { createWallDefinition } from '../src/core/architecture/walls/wallDefinition.js';
import { serializeWalls, deserializeWalls } from '../src/core/architecture/walls/wallPersistence.js';
import { buildWallGeometry2D } from '../src/core/architecture/walls/wallGeometry2D.js';
import { buildWallsGeometry3D } from '../src/core/architecture/walls/wallGeometry3D.js';

const snap = (start, point, options = {}) => resolveWallAngularSnap(start, point, { scale: 80, ...options });
const pointAt = (degrees, length = 3) => ({
  x: length * Math.cos(degrees * Math.PI / 180),
  z: length * Math.sin(degrees * Math.PI / 180),
});

test('ajusta las cuatro direcciones ortogonales y conserva distancia', () => {
  for (const [angle, axis] of [[2, 'HORIZONTAL'], [178, 'HORIZONTAL'], [88, 'VERTICAL'], [272, 'VERTICAL']]) {
    const raw = pointAt(angle);
    const result = snap({ x: 0, z: 0 }, raw);
    assert.equal(result.axis, axis);
    assert.ok(Math.abs(Math.hypot(result.point.x, result.point.z) - 3) < 1e-12);
    assert.equal(axis === 'HORIZONTAL' ? result.point.z : result.point.x, 0);
    assert.equal(Math.sign(axis === 'HORIZONTAL' ? result.point.x : result.point.z),
      Math.sign(axis === 'HORIZONTAL' ? raw.x : raw.z));
  }
});

test('diagonales 15, 30, 45 y 60 grados permanecen libres', () => {
  for (const angle of [15, 30, 45, 60]) {
    const raw = pointAt(angle);
    assert.deepEqual(snap({ x: 0, z: 0 }, raw), { point: raw, axis: null });
  }
  const raw = { x: 3.2, z: 2.1 };
  assert.deepEqual(snap({ x: 0, z: 0 }, raw).point, raw);
});

test('aplica tolerancia angular de 5 grados y respeta ambos lados del límite', () => {
  assert.equal(WALL_ANGLE_TOLERANCE_RAD, 5 * Math.PI / 180);
  assert.equal(snap({ x: 0, z: 0 }, pointAt(4.9)).axis, 'HORIZONTAL');
  assert.equal(snap({ x: 0, z: 0 }, pointAt(5.1)).axis, null);
  assert.equal(snap({ x: 0, z: 0 }, pointAt(85.1)).axis, 'VERTICAL');
  assert.equal(snap({ x: 0, z: 0 }, pointAt(84.9)).axis, null);
});

test('distancia corta no activa la guía; distancias grandes sí', () => {
  assert.equal(WALL_ANGLE_MIN_DISTANCE_PX, 10);
  assert.equal(snap({ x: 0, z: 0 }, pointAt(2, 0.1)).axis, null);
  assert.equal(snap({ x: 0, z: 0 }, pointAt(2, 100)).axis, 'HORIZONTAL');
  assert.equal(snap({ x: 0, z: 0 }, pointAt(2, 3), { scale: 2 }).axis, null);
});

test('usa el último punto de la polilínea y admite coordenadas negativas', () => {
  const points = [{ x: -5, z: -4 }, { x: -2, z: -1 }];
  const result = snap(points.at(-1), { x: -1.99, z: -4 });
  assert.equal(result.axis, 'VERTICAL');
  assert.equal(result.point.x, -2);
  assert.ok(result.point.z < -1);
  assert.deepEqual(points, [{ x: -5, z: -4 }, { x: -2, z: -1 }]);
});

test('un snap a geometría existente conserva su punto exacto', () => {
  const raw = { x: 3, z: 0.1 };
  assert.deepEqual(snap({ x: 0, z: 0 }, raw, { pointSnapped: true }), { point: raw, axis: null });
  assert.deepEqual(snap(null, raw), { point: raw, axis: null });
});

test('solo se guardan puntos WALL; largo 2D/3D derivado y formato legacy conservado', () => {
  const adjusted = snap({ x: 0, z: 0 }, { x: 3, z: 0.1 });
  const wall = createWallDefinition({ id: 'ANGLE_WALL', points: [{ x: 0, z: 0 }, adjusted.point] });
  const serialized = serializeWalls([wall]);
  assert.equal(serialized[0].type, 'WALL');
  assert.equal(Object.hasOwn(serialized[0], 'length'), false);
  assert.equal(Object.hasOwn(serialized[0], 'snapMode'), false);
  assert.equal(Object.hasOwn(serialized[0], 'isSnapped'), false);
  assert.equal(buildWallGeometry2D(wall).segmentsGeometry[0].length,
    buildWallsGeometry3D([wall]).segmentsGeometry[0].length);
  assert.deepEqual(deserializeWalls({ architecture: { walls: serialized } }), serialized);
  const legacy = deserializeWalls({ architecture: { walls: [{ id: 'OLD', points: [{ x: 0, z: 0 }, { x: 1, z: 0 }] }] } });
  assert.equal(legacy.length, 1);
});
