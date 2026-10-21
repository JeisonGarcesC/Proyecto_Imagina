import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createWallDefinition, resizeWallSegment, updateWallPoint } from '../src/core/architecture/walls/wallDefinition.js';
import { createColumnDefinition } from '../src/core/architecture/columns/columnDefinition.js';
import { createDoorDefinition } from '../src/core/architecture/openings/doorDefinition.js';
import { buildWallGeometry2D } from '../src/core/architecture/walls/wallGeometry2D.js';
import { buildResolvedWallVolumes3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { createWallVolumeGeometry } from '../src/core/architecture/walls/wallExtrusion3D.js';
import { getWallFinishSurfaces } from '../src/core/architecture/walls/wallFinishSurfaces3D.js';

const wall = (id, coordinates, thickness = 0.1, height = 2.4) => createWallDefinition({
  id, thickness, height, points: coordinates.map(([x, z], index) => ({ id: `${id}-${index}`, x, z })),
});

function surfaceArea(geometry) {
  const p = geometry.getAttribute('position');
  let area = 0;
  for (let i = 0; i < p.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, i);
    const b = new THREE.Vector3().fromBufferAttribute(p, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
    area += new THREE.Vector3().crossVectors(b.sub(a), c.sub(a)).length() / 2;
  }
  return area;
}

function inspect(walls, options = {}) {
  const group = new THREE.Group();
  const volumes = buildResolvedWallVolumes3D(walls, options);
  for (const volume of volumes) {
    const old = createWallVolumeGeometry({ ...volume, sources: null });
    const current = createWallVolumeGeometry(volume);
    assert.ok(Math.abs(surfaceArea(old) - surfaceArea(current)) < 1e-5,
      `el área exterior debe permanecer igual: ${surfaceArea(old)} vs ${surfaceArea(current)}`);
    old.computeBoundingBox();
    current.computeBoundingBox();
    assert.ok(old.boundingBox.min.distanceTo(current.boundingBox.min) < 1e-6,
      `min ${old.boundingBox.min.toArray()} vs ${current.boundingBox.min.toArray()}`);
    assert.ok(old.boundingBox.max.distanceTo(current.boundingBox.max) < 1e-6);
    old.dispose();
    const mesh = new THREE.Mesh(current, current.userData.wallFinishClasses.map(() => new THREE.MeshBasicMaterial()));
    mesh.userData.kind = 'WALL';
    group.add(mesh);
  }
  const classes = group.children.flatMap((mesh) => mesh.geometry.userData.wallFinishClasses);
  assert.ok(classes.every((item) => item.wallIds.length >= 1), JSON.stringify(classes));
  const result = { group, classes, get: (id) => getWallFinishSurfaces(group, id) };
  return result;
}

test('muro aislado y dos separados conservan atribución exclusiva', () => {
  const one = inspect([wall('W1', [[0, 0], [2, 0]])]);
  assert.ok(one.get('W1').length);
  one.group.updateMatrixWorld(true);
  assert.ok(new THREE.Raycaster(new THREE.Vector3(1, 5, 0),
    new THREE.Vector3(0, -1, 0)).intersectObject(one.group, true).length);
  assert.ok(one.classes.every((item) => item.type === 'EXCLUSIVE' && item.wallIds[0] === 'W1'));
  const two = inspect([wall('W1', [[0, 0], [2, 0]]), wall('W2', [[0, 1], [2, 1]])]);
  assert.ok(two.get('W1').length && two.get('W2').length);
  assert.ok(two.get('W1').every((item) => item.wallIds.join() === 'W1'));
  assert.ok(two.get('W2').every((item) => item.wallIds.join() === 'W2'));
});

test('L, T, X, diagonal y espesores distintos separan exclusivas y compartidas', () => {
  const layouts = [
    [wall('W1', [[-2, 0], [0, 0]]), wall('W2', [[0, 0], [0, 2]])],
    [wall('W1', [[-2, 0], [2, 0]]), wall('W2', [[0, 0], [0, 2]])],
    [wall('W1', [[-2, 0], [2, 0]]), wall('W2', [[0, -2], [0, 2]])],
    [wall('W1', [[-2, 0], [2, 0]], 0.2), wall('W2', [[-2, -2], [2, 2]], 0.1)],
  ];
  for (const [index, walls] of layouts.entries()) {
    const result = inspect(walls);
    assert.deepEqual(result.classes, inspect(walls).classes);
    assert.ok(result.get('W1').length && result.get('W2').length);
    const shared = result.classes.some((item) => item.type === 'SHARED'
      && item.wallIds.includes('W1') && item.wallIds.includes('W2'));
    // Una L a inglete correcto comparte arista interna, no área visible.
    if (index === 0) assert.equal(shared, false);
    else assert.equal(shared, true);
    assert.ok(result.get('W1').every((item) => item.type === 'EXCLUSIVE' && item.wallIds.join() === 'W1'));
    assert.ok(result.get('W2').every((item) => item.type === 'EXCLUSIVE' && item.wallIds.join() === 'W2'));
  }
});

test('tres, cuatro, coincidencia parcial y multisegmento conservan IDs', () => {
  const rays = [wall('A', [[-2, 0], [0, 0]]), wall('B', [[0, 0], [2, 0]]),
    wall('C', [[0, 0], [0, 2]]), wall('D', [[0, 0], [0, -2]])];
  for (const count of [3, 4]) {
    const result = inspect(rays.slice(0, count));
    for (const item of rays.slice(0, count)) assert.ok(result.get(item.id).length);
  }
  const overlap = inspect([wall('A', [[0, 0], [3, 0]]), wall('B', [[1, 0], [4, 0]])]);
  assert.ok(overlap.get('A').length && overlap.get('B').length);
  assert.ok(overlap.classes.some((item) => item.wallIds.length > 1));
  const multi = inspect([wall('MULTI', [[0, 0], [2, 0], [2, 2], [4, 2]])]);
  assert.ok(multi.get('MULTI').length);
  assert.ok(multi.classes.every((item) => item.wallIds.join() === 'MULTI'));
});

test('abertura, dintel, columna y edición reconstruyen sin cambiar procedencia', () => {
  const first = wall('W', [[0, 0], [4, 0]]);
  const segmentId = buildWallGeometry2D(first).segmentsGeometry[0].segmentId;
  const opening = createDoorDefinition({ wallId: 'W', segmentId, offset: 1, width: 0.8, height: 2.1 });
  const column = createColumnDefinition({ id: 'C', position: { x: 3, z: 0 },
    width: 0.3, depth: 0.3, rotation: Math.PI / 4, height: 1.2 });
  for (const current of [first, resizeWallSegment(first, 0, 5), updateWallPoint(first, 1, { x: 4, z: 1 })]) {
    const result = inspect([current], { openings: [opening], columns: [column] });
    assert.ok(result.get('W').length);
    assert.ok(result.classes.every((item) => item.wallIds.join() === 'W'));
  }
});

test('la atribución no depende de la ubicación de los muros en el plano', () => {
  for (const offset of [0, 50, 500]) {
    const result = inspect([
      wall('H', [[offset - 2, offset], [offset + 2, offset]], 0.2),
      wall('V', [[offset, offset - 2], [offset, offset + 2]], 0.1),
    ]);
    assert.ok(result.get('H').length && result.get('V').length);
    assert.ok(result.classes.every((item) => item.wallIds.length >= 1));
  }
});
