import test from 'node:test';
import assert from 'node:assert/strict';
import { createWallDefinition } from '../src/core/architecture/walls/wallDefinition.js';
import { COLUMN_SHAPES, createColumnDefinition } from '../src/core/architecture/columns/columnDefinition.js';
import {
  ARCHITECTURE_SNAP_SOURCE_TYPES,
  buildArchitectureSnapGeometry,
} from '../src/core/architecture/snapping/architectureSnapGeometry2D.js';
import { resolveSnapPoint, SNAP_TYPES } from '../src/plan2d/geometrySnap2D.js';

const wall = (overrides = {}) => createWallDefinition({
  id: 'WALL_A',
  points: [{ x: 0, z: 0 }, { x: 4, z: 0 }],
  height: 2.4,
  thickness: 0.1,
  ...overrides,
});

const rectangle = (overrides = {}) => createColumnDefinition({
  id: 'COLUMN_RECT',
  shape: COLUMN_SHAPES.RECTANGLE,
  position: { x: 6, z: 2 },
  width: 2,
  depth: 1,
  height: 2.4,
  ...overrides,
});

test('muros aportan extremos, punto medio y segmento de eje', () => {
  const geometry = buildArchitectureSnapGeometry({ walls: [wall()] });
  assert.equal(geometry.points.filter((point) => point.type === SNAP_TYPES.ENDPOINT).length, 2);
  assert.deepEqual(
    geometry.points.find((point) => point.type === SNAP_TYPES.MIDPOINT).point,
    { x: 2, z: 0 }
  );
  assert.equal(geometry.segments.length, 1);
  assert.equal(geometry.segments[0].sourceType, ARCHITECTURE_SNAP_SOURCE_TYPES.WALL);
});

test('intersecciones de ejes de muro generan candidato estable', () => {
  const crossing = buildArchitectureSnapGeometry({
    walls: [
      wall({ id: 'H', points: [{ x: -2, z: 0 }, { x: 2, z: 0 }] }),
      wall({ id: 'V', points: [{ x: 0, z: -2 }, { x: 0, z: 2 }] }),
    ],
  });
  const intersection = crossing.points.find((point) => point.type === SNAP_TYPES.INTERSECTION);
  assert.deepEqual(intersection.point, { x: 0, z: 0 });
  assert.equal(intersection.metadata.joinType, 'X');
});

test('columna rectangular aporta esquinas, centros de cara y centro', () => {
  const geometry = buildArchitectureSnapGeometry({ columns: [rectangle()] });
  assert.equal(geometry.points.filter((point) => point.type === SNAP_TYPES.CORNER).length, 4);
  assert.equal(geometry.points.filter((point) => point.type === SNAP_TYPES.FACE_MIDPOINT).length, 4);
  assert.deepEqual(geometry.points.find((point) => point.type === SNAP_TYPES.CENTER).point, { x: 6, z: 2 });
});

test('columna circular aporta centro y cuatro puntos cardinales', () => {
  const circle = createColumnDefinition({
    id: 'COLUMN_CIRCLE', shape: COLUMN_SHAPES.CIRCLE,
    position: { x: -2, z: 3 }, diameter: 2, height: 2.4,
  });
  const geometry = buildArchitectureSnapGeometry({ columns: [circle] });
  assert.equal(geometry.points.filter((point) => point.type === SNAP_TYPES.FACE_MIDPOINT).length, 4);
  assert.ok(geometry.points.some((point) => point.point.x === -1 && point.point.z === 3));
});

test('mobiliario reutiliza Footprint2D para esquinas, centros y segmentos', () => {
  const geometry = buildArchitectureSnapGeometry({
    furniture: [{ id: 'DESK', x: 1, z: 5, w: 2, d: 1, rotY: 0 }],
  });
  assert.equal(geometry.points.filter((point) => point.type === SNAP_TYPES.CORNER).length, 4);
  assert.equal(geometry.points.filter((point) => point.type === SNAP_TYPES.CENTER).length, 1);
  assert.equal(geometry.segments.length, 4);
  assert.ok(geometry.points.every((point) => point.sourceType === ARCHITECTURE_SNAP_SOURCE_TYPES.FURNITURE));
});

test('excluye entidades invisibles pero conserva bloqueadas', () => {
  const geometry = buildArchitectureSnapGeometry({
    walls: [wall({ id: 'HIDDEN_WALL', visible: false })],
    columns: [rectangle({ id: 'LOCKED_COLUMN', locked: true })],
    furniture: [{ id: 'HIDDEN_PART', x: 0, z: 0, w: 1, d: 1, visible: false }],
  });
  assert.ok(geometry.points.some((point) => point.sourceId === 'LOCKED_COLUMN'));
  assert.ok(!geometry.points.some((point) => point.sourceId === 'HIDDEN_WALL'));
  assert.ok(!geometry.points.some((point) => point.sourceId === 'HIDDEN_PART'));
});

test('resolver conserva tolerancia visual constante con distintos zooms', () => {
  const geometry = buildArchitectureSnapGeometry({ walls: [wall()] });
  const nearAt100 = resolveSnapPoint({ worldPoint: { x: 0, z: 0.09 }, scale: 100, tolerancePx: 10, geometry });
  const farAt200 = resolveSnapPoint({ worldPoint: { x: 0, z: 0.09 }, scale: 200, tolerancePx: 10, geometry });
  assert.equal(nearAt100.snapped, true);
  assert.equal(nearAt100.type, SNAP_TYPES.ENDPOINT);
  assert.equal(farAt200.snapped, false);
});

test('prioriza extremo sobre candidatos de menor prioridad', () => {
  const geometry = {
    points: [
      { type: SNAP_TYPES.MIDPOINT, point: { x: 0, z: 0 }, sourceId: 'MID' },
      { type: SNAP_TYPES.ENDPOINT, point: { x: 0.05, z: 0 }, sourceId: 'END' },
    ],
    segments: [],
  };
  const result = resolveSnapPoint({ worldPoint: { x: 0, z: 0 }, scale: 100, tolerancePx: 10, geometry });
  assert.equal(result.type, SNAP_TYPES.ENDPOINT);
  assert.equal(result.sourceId, 'END');
});

test('wall DRAW captura un extremo con coordenada geométrica exacta', () => {
  const geometry = buildArchitectureSnapGeometry({ walls: [wall()] });
  const result = resolveSnapPoint({ worldPoint: { x: 4.04, z: 0.02 }, scale: 100, tolerancePx: 10, geometry });
  assert.equal(result.snapped, true);
  assert.equal(result.type, SNAP_TYPES.ENDPOINT);
  assert.deepEqual(result.point, { x: 4, z: 0 });
});

test('column PLACE captura una esquina de columna existente', () => {
  const geometry = buildArchitectureSnapGeometry({ columns: [rectangle()] });
  const result = resolveSnapPoint({ worldPoint: { x: 5.04, z: 1.53 }, scale: 100, tolerancePx: 10, geometry });
  assert.equal(result.snapped, true);
  assert.equal(result.type, SNAP_TYPES.CORNER);
  assert.deepEqual(result.point, { x: 5, z: 1.5 });
});

test('fuera de tolerancia conserva el punto libre', () => {
  const geometry = buildArchitectureSnapGeometry({ walls: [wall()] });
  const worldPoint = { x: 10, z: 10 };
  const result = resolveSnapPoint({ worldPoint, scale: 100, tolerancePx: 10, geometry });
  assert.equal(result.snapped, false);
  assert.deepEqual(result.point, worldPoint);
});
