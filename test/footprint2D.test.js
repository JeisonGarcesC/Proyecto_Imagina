import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  FOOTPRINT2D_TYPES,
  convexHull2D,
  createPolygonFootprint,
  createRectangleFootprint,
} from '../src/plan2d/footprint2D.js';
import {
  clearFootprint2DCache,
  getFootprint2D,
  getFootprint2DCacheEntry,
} from '../src/plan2d/extractFootprint2D.js';

function approximately(actual, expected, epsilon = 1e-5) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} no está cerca de ${expected}`);
}

function createGeometry(points) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points.flatMap(({ x, y = 0, z }) => [x, y, z]), 3)
  );
  return geometry;
}

test('crea un rectángulo desde bounds2d', () => {
  const footprint = createRectangleFootprint({
    localCenter: [1, 0, -2],
    sizeLocal: [4, 1, 6],
  });
  assert.equal(footprint.type, FOOTPRINT2D_TYPES.RECTANGLE);
  assert.deepEqual(footprint.center, { x: 1, z: -2 });
  assert.deepEqual(footprint.bounds, { w: 4, d: 6 });
  assert.equal(footprint.points.length, 4);
});

test('extrae un triángulo desde BufferGeometry', () => {
  const root = new THREE.Group();
  root.add(
    new THREE.Mesh(
      createGeometry([
        { x: 0, z: 0 },
        { x: 2, z: 0 },
        { x: 0, z: 1 },
      ])
    )
  );
  const footprint = getFootprint2D(root);
  assert.equal(footprint.type, FOOTPRINT2D_TYPES.POLYGON);
  assert.equal(footprint.points.length, 3);
});

test('simplifica un círculo aproximado sin perder sus bounds', () => {
  const points = Array.from({ length: 64 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    return { x: Math.cos(angle), z: Math.sin(angle) };
  });
  const footprint = createPolygonFootprint(points, { tolerance: 0.006 });
  approximately(footprint.bounds.w, 2);
  approximately(footprint.bounds.d, 2);
  assert.ok(footprint.points.length < points.length);
});

test('conserva las proporciones de una elipse aproximada', () => {
  const points = Array.from({ length: 48 }, (_, index) => {
    const angle = (index / 48) * Math.PI * 2;
    return { x: Math.cos(angle) * 3, z: Math.sin(angle) };
  });
  const footprint = createPolygonFootprint(points, { tolerance: 0.004 });
  approximately(footprint.bounds.w, 6);
  approximately(footprint.bounds.d, 2);
});

test('convex hull elimina la concavidad de una forma irregular', () => {
  const footprint = createPolygonFootprint([
    { x: 0, z: 0 },
    { x: 3, z: 0 },
    { x: 3, z: 2 },
    { x: 1.5, z: 0.5 },
    { x: 0, z: 2 },
  ]);
  assert.equal(footprint.points.length, 4);
  assert.deepEqual(footprint.bounds, { w: 3, d: 2 });
});

test('ignora puntos repetidos', () => {
  const hull = convexHull2D([
    { x: 0, z: 0 },
    { x: 1, z: 0 },
    { x: 1, z: 1 },
    { x: 0, z: 1 },
    { x: 0, z: 0 },
    { x: 1, z: 1 },
  ]);
  assert.equal(hull.length, 4);
});

test('reduce puntos colineales a sus extremos', () => {
  assert.deepEqual(
    convexHull2D([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
    ]),
    [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
    ]
  );
});

test('aplica la transformación interna del mesh al espacio local del root', () => {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1));
  mesh.position.set(3, 0, -2);
  mesh.rotation.y = Math.PI / 2;
  root.add(mesh);
  const footprint = getFootprint2D(root);
  approximately(footprint.center.x, 3);
  approximately(footprint.center.z, -2);
  approximately(footprint.bounds.w, 1);
  approximately(footprint.bounds.d, 2);
});

test('mover y rotar el root reutiliza su footprint local cacheado', () => {
  clearFootprint2DCache();
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1, 3)));
  const first = getFootprint2D(root);
  const entry = getFootprint2DCacheEntry(root);
  root.position.set(20, 4, -11);
  root.rotation.y = 1.2;
  const second = getFootprint2D(root);
  assert.strictEqual(second, first);
  assert.strictEqual(getFootprint2DCacheEntry(root), entry);
});

test('usa fallback rectangular sin geometría válida', () => {
  const footprint = getFootprint2D(new THREE.Group(), {
    fallbackBounds: { localCenter: [0, 0, 0], sizeLocal: [2, 1, 4] },
  });
  assert.equal(footprint.type, FOOTPRINT2D_TYPES.RECTANGLE);
  assert.deepEqual(footprint.bounds, { w: 2, d: 4 });
});

test('procesa muchos vértices una vez y reutiliza la caché', () => {
  clearFootprint2DCache();
  const root = new THREE.Group();
  const points = Array.from({ length: 10000 }, (_, index) => {
    const angle = (index / 10000) * Math.PI * 2;
    return { x: Math.cos(angle), z: Math.sin(angle) };
  });
  root.add(new THREE.Mesh(createGeometry(points)));
  const first = getFootprint2D(root);
  const second = getFootprint2D(root);
  assert.strictEqual(second, first);
  assert.ok(first.points.length < points.length);
});
