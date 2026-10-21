import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWallDefinition, resizeWallSegment, updateWallDefinition } from '../src/core/architecture/walls/wallDefinition.js';
import { createWallSegmentId } from '../src/core/architecture/walls/wallGeometry2D.js';
import { buildResolvedWallVolumes3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { createWallVolumeGeometry } from '../src/core/architecture/walls/wallExtrusion3D.js';
import { resolveWallIdFrom3DHit } from '../src/core/architecture/walls/wallSelection3D.js';
import { selectWallAtPoint } from '../src/core/architecture/walls/wallInteraction2D.js';
import { serializeWalls, deserializeWalls } from '../src/core/architecture/walls/wallPersistence.js';

const wall = (id, coords, thickness = 0.1) => createWallDefinition({
  id, thickness, height: 2.4,
  points: coords.map(([x, z], index) => ({ id: `${id}-p${index}`, x, z })),
});

function pickWall(walls, origin, direction, openings = []) {
  const group = new THREE.Group();
  for (const volume of buildResolvedWallVolumes3D(walls, { openings })) {
    const mesh = new THREE.Mesh(createWallVolumeGeometry(volume), new THREE.MeshBasicMaterial());
    mesh.position.y = volume.baseElevation;
    mesh.userData.kind = 'WALL';
    mesh.userData.wallIds = volume.wallIds;
    if (volume.wallIds.length === 1) mesh.userData.wallId = volume.wallIds[0];
    group.add(mesh);
  }
  group.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction));
  const hit = raycaster.intersectObjects([group], true)[0];
  const id = resolveWallIdFrom3DHit(hit, walls);
  group.traverse((object) => {
    if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); }
  });
  return id;
}

const pickFromAbove = (walls, x, z, openings = []) =>
  pickWall(walls, [x, 5, z], [0, -1, 0], openings);

test('muro aislado conserva wallId en un raycast real', () => {
  const walls = [wall('A', [[0, 0], [4, 0]])];
  assert.equal(pickFromAbove(walls, 1, 0), 'A');
  assert.equal(pickFromAbove(walls, 1, 1), null);
});

test('L, T y X conservan las dos identidades aunque compartan volumen', () => {
  const scenes = [
    [wall('A', [[0, 0], [4, 0]]), wall('B', [[4, 0], [4, 3]])],
    [wall('A', [[0, 0], [4, 0]]), wall('B', [[2, 0], [2, 3]])],
    [wall('A', [[0, 0], [4, 0]]), wall('B', [[2, -2], [2, 2]])],
  ];
  for (const walls of scenes) {
    assert.equal(pickFromAbove(walls, 1, 0), 'A');
    const b = walls[1].points;
    assert.equal(pickFromAbove(walls, b.at(-1).x, b.at(-1).z - 0.2), 'B');
  }
});

test('X central utiliza el orden lógico en empate exacto', () => {
  const walls = [wall('A', [[0, 0], [4, 0]]), wall('B', [[2, -2], [2, 2]])];
  assert.equal(pickFromAbove(walls, 2, 0), 'A');
  assert.equal(pickFromAbove([...walls].reverse(), 2, 0), 'B');
});

test('diagonales 15, 30, 45 y 60 grados mantienen wallId', () => {
  for (const angle of [15, 30, 45, 60]) {
    const radians = angle * Math.PI / 180;
    const walls = [wall('A', [[-2, 0], [2, 0]]),
      wall('B', [[0, 0], [3 * Math.cos(radians), 3 * Math.sin(radians)]])];
    assert.equal(pickFromAbove(walls, 2 * Math.cos(radians), 2 * Math.sin(radians)), 'B');
  }
});

test('tres muros y espesores distintos mantienen selección individual', () => {
  const walls = [wall('A', [[-3, 0], [3, 0]], 0.1),
    wall('B', [[0, 0], [0, 3]], 0.2), wall('C', [[0, 0], [-2, -2]], 0.15)];
  assert.equal(pickFromAbove(walls, 2, 0), 'A');
  assert.equal(pickFromAbove(walls, 0, 2), 'B');
  assert.equal(pickFromAbove(walls, -1, -1), 'C');
  const four = [...walls, wall('D', [[0, 0], [2, -2]], 0.12)];
  assert.equal(pickFromAbove(four, 1, -1), 'D');
});

test('multisegmento conserva un solo ID y admite edición lógica', () => {
  const original = wall('A', [[0, 0], [2, 0], [2, 2], [4, 2]]);
  assert.equal(pickFromAbove([original], 1, 0), 'A');
  assert.equal(pickFromAbove([original], 2, 1), 'A');
  assert.equal(pickFromAbove([original], 3, 2), 'A');
  const edited = resizeWallSegment(original, 0, 3);
  assert.equal(edited.id, 'A');
  assert.equal(edited.points[1].id, original.points[1].id);
  assert.equal(pickFromAbove([edited], 1, 0), 'A');
  const resized = updateWallDefinition(edited, { thickness: 0.2, height: 3 });
  assert.equal(pickFromAbove([resized], 1, 0), 'A');
  assert.equal(resized.thickness, 0.2);
  assert.equal(resized.height, 3);
});

test('abertura no recibe selección sobre el hueco; dintel y laterales sí', () => {
  const walls = [wall('A', [[0, 0], [4, 0]])];
  const openings = [{ id: 'D', type: 'DOOR', wallId: 'A',
    segmentId: createWallSegmentId('A-p0', 'A-p1'), offset: 2, width: 1, height: 2, sillHeight: 0 }];
  assert.equal(pickFromAbove(walls, 1, 0, openings), 'A');
  assert.equal(pickFromAbove(walls, 2, 0, openings), 'A');
  assert.equal(pickWall(walls, [2, 1, 1], [0, 0, -1], openings), null);
  assert.equal(pickWall(walls, [2, 2.2, 1], [0, 0, -1], openings), 'A');
  assert.equal(resolveWallIdFrom3DHit({ object: { userData: { kind: 'DOOR', wallId: 'A' } }, point: { x: 2, z: 0 } }, walls), 'A');
});

test('selección 2D y persistencia declarativa permanecen independientes', () => {
  const walls = [wall('A', [[0, 0], [4, 0]]), wall('B', [[2, 0], [2, 3]])];
  assert.equal(selectWallAtPoint({ x: 1, z: 0 }, walls), 'A');
  assert.equal(selectWallAtPoint({ x: 2, z: 2 }, walls), 'B');
  const saved = serializeWalls(walls);
  assert.deepEqual(deserializeWalls({ walls: saved }).map((item) => item.id), ['A', 'B']);
  assert.equal(JSON.stringify(saved).includes('wallIds'), false);
  assert.equal(JSON.stringify(saved).includes('rings'), false);
});
