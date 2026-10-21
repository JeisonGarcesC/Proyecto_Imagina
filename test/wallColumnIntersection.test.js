import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWallDefinition, updateWallPoint, resizeWallSegment } from '../src/core/architecture/walls/wallDefinition.js';
import { createColumnDefinition, updateColumnDefinition } from '../src/core/architecture/columns/columnDefinition.js';
import { buildColumnSectionPolygon, buildResolvedWallColumnFootprint } from '../src/core/architecture/columns/wallColumnIntersection.js';
import { buildResolvedWallFootprint, wallRingArea } from '../src/core/architecture/walls/wallResolvedFootprint.js';
import { buildResolvedWallVolumes3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { createWallVolumeGeometry } from '../src/core/architecture/walls/wallExtrusion3D.js';
import { createWallSegmentId } from '../src/core/architecture/walls/wallGeometry2D.js';
import { serializeWalls, deserializeWalls } from '../src/core/architecture/walls/wallPersistence.js';
import { serializeColumns, deserializeColumns } from '../src/core/architecture/columns/columnPersistence.js';
import { selectWallAtPoint } from '../src/core/architecture/walls/wallInteraction2D.js';
import { selectColumnAtPoint } from '../src/core/architecture/columns/columnInteraction2D.js';

const wall = (id, coords, thickness = 0.1, height = 2.4) => createWallDefinition({
  id, thickness, height,
  points: coords.map(([x, z], index) => ({ id: `${id}-${index}`, x, z })),
});
const rectangle = (id, x, z, width = 0.4, depth = 0.2, rotation = 0, height = 2.4) =>
  createColumnDefinition({ id, shape: 'RECTANGLE', position: { x, z }, width, depth, rotation, height });
const circle = (id, x, z, diameter = 0.3) =>
  createColumnDefinition({ id, shape: 'CIRCLE', position: { x, z }, diameter });

const area = (footprint) => Math.abs(footprint.rings.reduce((sum, ring) => sum + wallRingArea(ring), 0));
function contains(point, rings) {
  let count = 0;
  for (const ring of rings) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const a = ring[i]; const b = ring[j];
      if ((a.z > point.z) !== (b.z > point.z) &&
          point.x < a.x + (point.z - a.z) * (b.x - a.x) / (b.z - a.z)) inside = !inside;
    }
    if (inside) count += 1;
  }
  return count % 2 === 1;
}

test('contacto, terminación, cruce, interior e intersección parcial recortan solo muro', () => {
  const cases = [
    { walls: [wall('W', [[-2, 0], [0, 0]])], columns: [rectangle('C', 0.2, 0)], overlap: false },
    { walls: [wall('W', [[-2, 0], [0, 0]])], columns: [rectangle('C', 0, 0)], overlap: true },
    { walls: [wall('W', [[-2, 0], [2, 0]])], columns: [rectangle('C', 0, 0)], overlap: true },
    { walls: [wall('W', [[-2, 0], [2, 0]], 0.5)], columns: [rectangle('C', 0, 0, 0.2, 0.2)], overlap: true },
    { walls: [wall('W', [[-2, 0], [2, 0]])], columns: [rectangle('C', 0, 0.1)], overlap: true },
  ];
  for (const { walls, columns, overlap } of cases) {
    const base = buildResolvedWallFootprint(walls);
    const result = buildResolvedWallColumnFootprint(walls, columns);
    assert.ok(area(result) <= area(base) + 1e-8);
    if (overlap) assert.ok(area(result) < area(base) - 1e-4);
    else assert.ok(Math.abs(area(result) - area(base)) < 1e-8);
    assert.deepEqual(walls[0].points.map((point) => point.id), ['W-0', 'W-1']);
    assert.equal(columns[0].id, 'C');
  }
});

test('dos, tres y cuatro muros conservan IDs alrededor de columna sin área duplicada', () => {
  const candidates = [
    wall('A', [[-2, 0], [0, 0]]), wall('B', [[0, 0], [2, 0]]),
    wall('C', [[0, 0], [0, 2]]), wall('D', [[0, -2], [0, 0]]),
  ];
  for (const count of [2, 3, 4]) {
    const walls = candidates.slice(0, count);
    const columns = [rectangle('COL', 0, 0)];
    const result = buildResolvedWallColumnFootprint(walls, columns);
    assert.ok(area(result) < area(buildResolvedWallFootprint(walls)));
    assert.equal(contains({ x: 0, z: 0 }, result.rings), false);
    assert.equal(selectWallAtPoint({ x: -1, z: 0 }, walls), 'A');
    assert.equal(selectColumnAtPoint({ x: 0, z: 0 }, columns), 'COL');
    assert.deepEqual(walls.map((item) => item.id), candidates.slice(0, count).map((item) => item.id));
  }
});

test('rectángulos 0°, 45°, 90°, círculo y diagonales producen secciones recortadas', () => {
  const walls = [wall('H', [[-2, 0], [2, 0]]), wall('V', [[0, -2], [0, 2]]),
    wall('D', [[-2, -2], [2, 2]])];
  for (const column of [
    rectangle('R0', 0, 0, 0.4, 0.2, 0),
    rectangle('R45', 0, 0, 0.4, 0.2, Math.PI / 4),
    rectangle('R90', 0, 0, 0.4, 0.2, Math.PI / 2),
    circle('C', 0, 0, 0.3),
  ]) {
    assert.ok(buildColumnSectionPolygon(column).length >= 4);
    for (const host of walls) {
      const footprint = buildResolvedWallColumnFootprint([host], [column]);
      assert.ok(area(footprint) < area(buildResolvedWallFootprint([host])));
      assert.equal(contains({ x: 0, z: 0 }, footprint.rings), false);
    }
  }
});

test('espesores distintos y columna parcial mantienen sección real', () => {
  for (const [thickness, width, depth] of [[0.1, 0.2, 0.2], [0.2, 0.2, 0.4]]) {
    const walls = [wall('W', [[-2, 0], [2, 0]], thickness)];
    const columns = [rectangle('C', 0, 0, width, depth)];
    assert.ok(area(buildResolvedWallColumnFootprint(walls, columns)) < area(buildResolvedWallFootprint(walls)));
  }
});

test('estratos 3D restan columna solo donde coinciden las alturas', () => {
  const walls = [wall('W', [[-2, 0], [2, 0]], 0.1, 3)];
  const column = rectangle('C', 0, 0, 0.4, 0.2, 0, 1);
  const volumes = buildResolvedWallVolumes3D(walls, { columns: [column] });
  assert.equal(volumes.length, 2);
  assert.equal(contains({ x: 0, z: 0 }, volumes[0].rings), false);
  assert.equal(contains({ x: 0, z: 0 }, volumes[1].rings), true);
  for (const volume of volumes) {
    const geometry = createWallVolumeGeometry(volume);
    assert.ok(geometry);
    geometry.dispose();
  }
  const elevated = updateColumnDefinition(column, { baseElevation: 4 });
  assert.ok(Math.abs(area(buildResolvedWallColumnFootprint(walls, [elevated])) -
    area(buildResolvedWallFootprint(walls))) < 1e-8);
});

test('raycasting 3D conserva superficies e IDs independientes', () => {
  const walls = [wall('W', [[-2, 0], [2, 0]])];
  const columns = [rectangle('C', 0, 0)];
  const wallGroup = new THREE.Group();
  for (const volume of buildResolvedWallVolumes3D(walls, { columns })) {
    const mesh = new THREE.Mesh(createWallVolumeGeometry(volume), new THREE.MeshBasicMaterial());
    mesh.position.y = volume.baseElevation;
    mesh.userData.kind = 'WALL';
    mesh.userData.wallIds = volume.wallIds;
    wallGroup.add(mesh);
  }
  const columnGroup = new THREE.Group();
  const descriptor = columns[0];
  const columnMesh = new THREE.Mesh(
    new THREE.BoxGeometry(descriptor.width, descriptor.height, descriptor.depth),
    new THREE.MeshBasicMaterial()
  );
  columnMesh.position.set(0, descriptor.height / 2, 0);
  columnMesh.userData.kind = 'COLUMN';
  columnMesh.userData.columnId = 'C';
  columnGroup.add(columnMesh);
  wallGroup.updateMatrixWorld(true);
  columnGroup.updateMatrixWorld(true);
  const pick = (x) => new THREE.Raycaster(new THREE.Vector3(x, 5, 0),
    new THREE.Vector3(0, -1, 0)).intersectObjects([wallGroup, columnGroup], true);
  const columnHits = pick(0);
  assert.equal(columnHits[0].object.userData.columnId, 'C');
  assert.equal(columnHits.some((hit) => hit.object.userData.kind === 'WALL'), false);
  assert.deepEqual(pick(1)[0].object.userData.wallIds, ['W']);
  for (const group of [wallGroup, columnGroup]) group.traverse((object) => {
    if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); }
  });
});

test('abertura y columna vecina conservan hueco, segmento y dintel', () => {
  const walls = [wall('W', [[0, 0], [4, 0]])];
  const openings = [{ id: 'O', type: 'DOOR', wallId: 'W',
    segmentId: createWallSegmentId('W-0', 'W-1'), offset: 2, width: 0.9, height: 2, sillHeight: 0 }];
  const columns = [rectangle('C', 3, 0)];
  const volumes = buildResolvedWallVolumes3D(walls, { columns, openings });
  assert.equal(contains({ x: 2, z: 0 }, volumes[0].rings), false);
  assert.equal(contains({ x: 2, z: 0 }, volumes.at(-1).rings), true);
  assert.equal(openings[0].segmentId, createWallSegmentId('W-0', 'W-1'));
});

test('multisegmento y ediciones recalculan huella sin modificar identidades', () => {
  const original = wall('W', [[-2, 0], [0, 0], [0, 2], [2, 2]]);
  const column = rectangle('C', 0, 0);
  const first = buildResolvedWallColumnFootprint([original], [column]);
  const resized = resizeWallSegment(original, 0, 3);
  const movedPoint = updateWallPoint(original, 1, { x: 0.5, z: 0 });
  const movedColumn = updateColumnDefinition(column, { position: { x: 1, z: 0 } });
  assert.equal(resized.id, original.id);
  assert.equal(movedPoint.points[1].id, original.points[1].id);
  assert.ok(area(buildResolvedWallColumnFootprint([resized], [column])) !== area(first));
  assert.ok(area(buildResolvedWallColumnFootprint([movedPoint], [column])) !== area(first));
  assert.ok(area(buildResolvedWallColumnFootprint([original], [movedColumn])) !== area(first));
});

test('geometría derivada no entra en persistencia', () => {
  const walls = [wall('W', [[-2, 0], [2, 0]])];
  const columns = [circle('C', 0, 0)];
  const resolved = buildResolvedWallColumnFootprint(walls, columns);
  assert.ok(resolved.rings.length);
  const project = { architecture: { walls: serializeWalls(walls), columns: serializeColumns(columns) } };
  const encoded = JSON.stringify(project);
  assert.equal(encoded.includes('rings'), false);
  assert.equal(encoded.includes('intersectionGeometry'), false);
  assert.deepEqual(deserializeWalls(project).map((item) => item.id), ['W']);
  assert.deepEqual(deserializeColumns(project).map((item) => item.id), ['C']);
});
