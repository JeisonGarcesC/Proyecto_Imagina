import test from 'node:test';
import assert from 'node:assert/strict';

import { FOOTPRINT2D_TYPES, createFootprint2D } from '../src/plan2d/footprint2D.js';
import {
  buildFootprintWorldGeometry,
  hitTestFootprint2D,
} from '../src/plan2d/footprintGeometry2D.js';
import {
  buildSelectionPolygon,
  collectSelectionCandidates,
  intersectsCrossingSelection,
  isWindowSelection,
  SELECTION_WINDOW_TYPES,
} from '../src/plan2d/selectionGeometry2D.js';
import { buildSnapGeometry, SNAP_TYPES } from '../src/plan2d/geometrySnap2D.js';

function part(overrides = {}) {
  return { id: 'PART_1', x: 0, z: 0, w: 4, d: 2, rotY: 0, ...overrides };
}

function footprint(type, points, extra = {}) {
  return createFootprint2D({ type, points, ...extra });
}

const rectangleWindow = (start, end, direction = SELECTION_WINDOW_TYPES.WINDOW) => ({
  startWorld: start,
  currentWorld: end,
  direction,
});

test('rectángulo conserva cuatro vértices y cuatro segmentos', () => {
  const geometry = buildFootprintWorldGeometry(part());
  assert.equal(geometry.fallback, true);
  assert.equal(geometry.vertices.length, 4);
  assert.equal(geometry.segments.length, 4);
});

test('triángulo utiliza sus tres puntos', () => {
  const target = part({
    footprint: footprint(
      FOOTPRINT2D_TYPES.TRIANGLE,
      [{ x: -2, z: -1 }, { x: 2, z: -1 }, { x: 0, z: 1 }]
    ),
  });
  assert.equal(buildFootprintWorldGeometry(target).vertices.length, 3);
});

test('polígono irregular conserva todos sus vértices simplificados', () => {
  const points = [
    { x: -2, z: -1 },
    { x: 1, z: -1 },
    { x: 2, z: 0 },
    { x: 0, z: 1 },
    { x: -2, z: 0.5 },
  ];
  const target = part({ footprint: footprint(FOOTPRINT2D_TYPES.POLYGON, points) });
  assert.equal(buildSelectionPolygon(target).length, points.length);
});

test('círculo se aproxima con 32 segmentos', () => {
  const target = part({
    footprint: footprint(FOOTPRINT2D_TYPES.CIRCLE, [], {
      center: { x: 0, z: 0 },
      bounds: { w: 4, d: 4 },
      radiusX: 2,
      radiusZ: 2,
    }),
    d: 4,
  });
  const geometry = buildFootprintWorldGeometry(target);
  assert.equal(geometry.vertices.length, 32);
  assert.equal(geometry.segments.length, 32);
  assert.equal(geometry.snapVertices.length, 4);
});

test('elipse conserva radios distintos', () => {
  const target = part({
    footprint: footprint(FOOTPRINT2D_TYPES.ELLIPSE, [], {
      center: { x: 0, z: 0 },
      bounds: { w: 4, d: 2 },
      radiusX: 2,
      radiusZ: 1,
    }),
  });
  assert.deepEqual(buildFootprintWorldGeometry(target).radii, { x: 2, z: 1 });
});

test('aplica rotación a la geometría mundial', () => {
  const geometry = buildFootprintWorldGeometry(part({ rotY: Math.PI / 2 }));
  assert.ok(Math.abs(geometry.vertices[0].x - 1) < 1e-9);
  assert.ok(Math.abs(geometry.vertices[0].z + 2) < 1e-9);
});

test('aplica movimiento a la geometría mundial', () => {
  const geometry = buildFootprintWorldGeometry(part({ x: 10, z: -3 }));
  assert.deepEqual(geometry.center, { x: 10, z: -3 });
  assert.deepEqual(geometry.vertices[0], { x: 8, z: -4 });
});

test('hit-test acepta un punto interior', () => {
  assert.equal(hitTestFootprint2D(part(), { x: 0.5, z: 0.5 }), true);
});

test('hit-test circular rechaza punto dentro del antiguo bounding box', () => {
  const target = part({
    d: 4,
    footprint: footprint(FOOTPRINT2D_TYPES.CIRCLE, [], {
      center: { x: 0, z: 0 },
      bounds: { w: 4, d: 4 },
      radiusX: 2,
      radiusZ: 2,
    }),
  });
  assert.equal(hitTestFootprint2D(target, { x: 1.8, z: 1.8 }), false);
});

test('Window exige que todo el footprint esté contenido', () => {
  const polygon = buildSelectionPolygon(part());
  assert.equal(isWindowSelection(polygon, rectangleWindow({ x: -3, z: -2 }, { x: 3, z: 2 })), true);
  assert.equal(isWindowSelection(polygon, rectangleWindow({ x: -1, z: -2 }, { x: 3, z: 2 })), false);
});

test('Crossing detecta intersección con el footprint', () => {
  const polygon = buildSelectionPolygon(part());
  const selection = rectangleWindow(
    { x: 1.5, z: -2 },
    { x: 2.5, z: 2 },
    SELECTION_WINDOW_TYPES.CROSSING
  );
  assert.equal(intersectsCrossingSelection(polygon, selection), true);
});

test('Crossing detecta cuando la ventana está dentro del footprint', () => {
  const polygon = buildSelectionPolygon(part());
  const selection = rectangleWindow(
    { x: -0.2, z: -0.2 },
    { x: 0.2, z: 0.2 },
    SELECTION_WINDOW_TYPES.CROSSING
  );
  assert.equal(intersectsCrossingSelection(polygon, selection), true);
});

test('collectSelectionCandidates respeta Window y Crossing', () => {
  const snapshot = [part()];
  const windowMiss = rectangleWindow({ x: -1, z: -2 }, { x: 3, z: 2 });
  const crossingHit = { ...windowMiss, direction: SELECTION_WINDOW_TYPES.CROSSING };
  assert.deepEqual(collectSelectionCandidates(snapshot, windowMiss), []);
  assert.deepEqual(collectSelectionCandidates(snapshot, crossingHit), ['PART_1']);
});

test('footprint corrupto mantiene fallback rectangular seleccionable', () => {
  const target = part({ footprint: { type: 'POLYGON', points: [{ x: NaN, z: 0 }] } });
  const geometry = buildFootprintWorldGeometry(target);
  assert.equal(geometry.fallback, true);
  assert.equal(hitTestFootprint2D(target, { x: 1.9, z: 0.9 }), true);
});

test('snapping poligonal genera vértices, midpoints y centro', () => {
  const target = part({
    footprint: footprint(
      FOOTPRINT2D_TYPES.TRIANGLE,
      [{ x: -2, z: -1 }, { x: 2, z: -1 }, { x: 0, z: 1 }]
    ),
  });
  const geometry = buildSnapGeometry([target]);
  assert.equal(geometry.points.filter(({ type }) => type === SNAP_TYPES.VERTEX).length, 3);
  assert.equal(geometry.points.filter(({ type }) => type === SNAP_TYPES.MIDPOINT).length, 3);
  assert.equal(geometry.points.filter(({ type }) => type === SNAP_TYPES.CENTER).length, 1);
  assert.equal(geometry.segments.length, 3);
});

test('snapping circular limita candidatos a cardinales y centro', () => {
  const target = part({
    d: 4,
    footprint: footprint(FOOTPRINT2D_TYPES.CIRCLE, [], {
      center: { x: 0, z: 0 },
      bounds: { w: 4, d: 4 },
      radiusX: 2,
      radiusZ: 2,
    }),
  });
  const geometry = buildSnapGeometry([target]);
  assert.equal(geometry.points.filter(({ type }) => type === SNAP_TYPES.VERTEX).length, 4);
  assert.equal(geometry.points.filter(({ type }) => type === SNAP_TYPES.CENTER).length, 1);
  assert.equal(geometry.segments.length, 0);
});
