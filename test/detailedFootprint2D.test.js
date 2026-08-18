import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  clearDetailedFootprint2DCache,
  extractDetailedFootprint2D,
} from '../src/plan2d/extractDetailedFootprint2D.js';
import { createRectangleFootprint } from '../src/plan2d/footprint2D.js';

function normalShape(width = 2, depth = 1) {
  return createRectangleFootprint({
    localCenter: [0, 0, 0],
    sizeLocal: [width, 1, depth],
  });
}

function mesh(geometry, name, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  object.name = name;
  object.position.fromArray(position);
  return object;
}

function product(children, userData = {}) {
  const root = new THREE.Group();
  root.userData = { codigoPT: 'TEST_001', kind: 'TEST', ...userData };
  children.forEach((child) => root.add(child));
  return root;
}

test.beforeEach(() => clearDetailedFootprint2DCache());

test('extrae un producto simple como una forma', () => {
  const root = product([mesh(new THREE.BoxGeometry(2, 1, 1), 'Cuerpo')]);
  const result = extractDetailedFootprint2D(root, { normalShape: normalShape() });
  assert.equal(result.detailedShapes.length, 1);
  assert.equal(result.metrics.meshCount, 1);
});

test('conserva múltiples meshes como contornos independientes', () => {
  const root = product([
    mesh(new THREE.BoxGeometry(1, 1, 1), 'Izquierda', [-0.5, 0, 0]),
    mesh(new THREE.BoxGeometry(1, 1, 1), 'Derecha', [0.5, 0, 0]),
  ]);
  const result = extractDetailedFootprint2D(root, { normalShape: normalShape() });
  assert.equal(result.detailedShapes.length, 2);
  assert.deepEqual(result.detailedShapes.map(({ sourceMesh }) => sourceMesh), [
    'Izquierda',
    'Derecha',
  ]);
});

test('mesa mantiene superficie y patas como formas separadas', () => {
  const parts = [mesh(new THREE.BoxGeometry(2, 0.1, 1), 'Superficie', [0, 1, 0])];
  [-0.8, 0.8].forEach((x) =>
    [-0.35, 0.35].forEach((z) =>
      parts.push(mesh(new THREE.BoxGeometry(0.12, 1, 0.12), 'Pata', [x, 0.5, z]))
    )
  );
  const result = extractDetailedFootprint2D(product(parts), { normalShape: normalShape() });
  assert.equal(result.detailedShapes.length, 5);
});

test('producto circular produce un contorno simplificado', () => {
  const root = product([mesh(new THREE.CylinderGeometry(1, 1, 1, 32), 'Circular')]);
  const result = extractDetailedFootprint2D(root, { normalShape: normalShape(2, 2) });
  assert.equal(result.detailedShapes.length, 1);
  assert.ok(result.detailedShapes[0].points.length <= 64);
});

test('producto irregular conserva su hull útil', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([
      -1, 0, -0.5,
      1, 0, -0.5,
      0.6, 0, 0.8,
      -0.7, 0, 0.6,
    ], 3)
  );
  const result = extractDetailedFootprint2D(product([mesh(geometry, 'Irregular')]), {
    normalShape: normalShape(2, 1.3),
  });
  assert.equal(result.detailedShapes[0].points.length, 4);
});

test('copias del mismo producto reutilizan la caché estructural', () => {
  const geometry = new THREE.BoxGeometry(2, 1, 1);
  const first = product([mesh(geometry, 'Cuerpo')]);
  const second = product([mesh(geometry, 'Cuerpo')]);
  const firstResult = extractDetailedFootprint2D(first, { normalShape: normalShape() });
  const secondResult = extractDetailedFootprint2D(second, { normalShape: normalShape() });
  assert.strictEqual(secondResult, firstResult);
});

test('movimiento y rotación del root no recalculan el detalle', () => {
  const root = product([mesh(new THREE.BoxGeometry(2, 1, 1), 'Cuerpo')]);
  const first = extractDetailedFootprint2D(root, { normalShape: normalShape() });
  root.position.set(10, 0, -5);
  root.rotation.y = Math.PI / 3;
  const second = extractDetailedFootprint2D(root, { normalShape: normalShape() });
  assert.strictEqual(second, first);
});

test('cambio de acabado no recalcula el detalle', () => {
  const root = product([mesh(new THREE.BoxGeometry(2, 1, 1), 'Cuerpo')]);
  const first = extractDetailedFootprint2D(root, { normalShape: normalShape() });
  root.userData.materialCode = 'NOGAL';
  const second = extractDetailedFootprint2D(root, { normalShape: normalShape() });
  assert.strictEqual(second, first);
});

test('cambio de variante invalida la entrada del root', () => {
  const root = product([mesh(new THREE.BoxGeometry(2, 1, 1), 'Cuerpo')], { variant: 'BASE' });
  const first = extractDetailedFootprint2D(root, { normalShape: normalShape() });
  root.userData.variant = 'ALTA';
  const second = extractDetailedFootprint2D(root, { normalShape: normalShape() });
  assert.notStrictEqual(second, first);
});

test('exceso de shapes activa fallback retornando null', () => {
  const root = product([
    mesh(new THREE.BoxGeometry(1, 1, 1), 'A'),
    mesh(new THREE.BoxGeometry(1, 1, 1), 'B'),
  ]);
  const result = extractDetailedFootprint2D(root, {
    normalShape: normalShape(),
    maxShapes: 1,
  });
  assert.equal(result, null);
});
