import assert from 'node:assert/strict';
import test from 'node:test';
import { createWallDefinition } from '../src/core/architecture/walls/wallDefinition.js';
import { buildResolvedWallFootprint } from '../src/core/architecture/walls/wallResolvedFootprint.js';
import { buildResolvedWallVolumes3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { createWallVolumeGeometry } from '../src/core/architecture/walls/wallExtrusion3D.js';
import { getWallFinishSurfaces } from '../src/core/architecture/walls/wallFinishSurfaces3D.js';
import * as THREE from 'three';

const EPSILON = 1e-7;
const wall = (id, coords, thickness = 0.2) => createWallDefinition({
  id, thickness, height: 2.4,
  points: coords.map(([x, z], index) => ({ id: `${id}-${index}`, x, z })),
});
const near = (a, b) => Math.abs(a - b) < EPSILON;
const hasVertex = (ring, x, z) => ring.some((point) => near(point.x, x) && near(point.z, z));

function assertAxisAligned(ring) {
  for (let i = 0; i < ring.length; i += 1) {
    const next = ring[(i + 1) % ring.length];
    assert.ok(near(ring[i].x, next.x) || near(ring[i].z, next.z),
      `arista diagonal artificial ${JSON.stringify([ring[i], next])}`);
  }
}

function assertSquareCorner(walls, outer, inner) {
  const before = JSON.stringify(walls);
  const first = buildResolvedWallFootprint(walls);
  const second = buildResolvedWallFootprint(walls);
  assert.deepEqual(second.rings, first.rings, 'huella determinista');
  assert.equal(JSON.stringify(walls), before, 'muros lógicos inmutables');
  assert.equal(first.rings.length, 1);
  const ring = first.rings[0];
  assert.ok(hasVertex(ring, ...outer), `falta esquina exterior ${outer}: ${JSON.stringify(ring)}`);
  assert.ok(hasVertex(ring, ...inner), `falta esquina interior ${inner}: ${JSON.stringify(ring)}`);
  assertAxisAligned(ring);
  const volume = buildResolvedWallVolumes3D(walls)[0];
  assert.deepEqual(volume.rings, first.rings);
  const geometry = createWallVolumeGeometry(volume);
  geometry.computeBoundingBox();
  assert.ok(geometry.getAttribute('position').count > 0);
  geometry.dispose();
}

test('L perpendicular: exterior e interior rectos en 2D y huella 3D', () => {
  assertSquareCorner([
    wall('W1', [[-2, 0], [0, 0]]),
    wall('W2', [[0, 0], [0, 2]]),
  ], [0.1, -0.1], [-0.1, 0.1]);
});

test('L invertida y espesores diferentes conservan esquinas rectas', () => {
  assertSquareCorner([
    wall('W1', [[2, 0], [0, 0]], 0.3),
    wall('W2', [[0, 0], [0, -2]], 0.1),
  ], [-0.05, 0.15], [0.05, -0.15]);
});

test('T, X, tres, cuatro y multisegmento ortogonales conservan contorno recto', () => {
  const east = wall('E', [[0, 0], [2, 0]]);
  const north = wall('N', [[0, 0], [0, 2]]);
  const west = wall('W', [[0, 0], [-2, 0]]);
  const south = wall('S', [[0, 0], [0, -2]]);
  const cases = [
    [wall('HOST', [[-2, 0], [2, 0]]), north],
    [wall('HOST', [[-2, 0], [2, 0]]), wall('CROSS', [[0, -2], [0, 2]])],
    [east, north, west],
    [east, north, west, south],
    [wall('MULTI', [[-2, 0], [0, 0], [0, 2]])],
  ];
  for (const walls of cases) {
    const rings = buildResolvedWallFootprint(walls).rings;
    assert.equal(rings.length, 1);
    rings.forEach(assertAxisAligned);
  }
});

test('atribución EXCLUSIVE sigue disponible tras reconstruir esquina L', () => {
  const walls = [wall('W1', [[-2, 0], [0, 0]]), wall('W2', [[0, 0], [0, 2]])];
  const group = new THREE.Group();
  for (const volume of buildResolvedWallVolumes3D(walls)) {
    const geometry = createWallVolumeGeometry(volume);
    const mesh = new THREE.Mesh(geometry, geometry.userData.wallFinishClasses.map(() =>
      new THREE.MeshStandardMaterial()));
    mesh.userData.kind = 'WALL';
    group.add(mesh);
  }
  assert.ok(getWallFinishSurfaces(group, 'W1').length);
  assert.ok(getWallFinishSurfaces(group, 'W2').length);
});
