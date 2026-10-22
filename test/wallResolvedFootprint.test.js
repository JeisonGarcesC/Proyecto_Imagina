import assert from 'node:assert/strict';
import test from 'node:test';
import { createWallDefinition } from '../src/core/architecture/walls/wallDefinition.js';
import { buildResolvedWallFootprint, wallRingArea } from '../src/core/architecture/walls/wallResolvedFootprint.js';
import { buildResolvedWallVolumes3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { createDoorDefinition } from '../src/core/architecture/openings/doorDefinition.js';
import { buildWallGeometry2D } from '../src/core/architecture/walls/wallGeometry2D.js';
import { serializeWalls, deserializeWalls } from '../src/core/architecture/walls/wallPersistence.js';
import { createWallVolumeGeometry } from '../src/core/architecture/walls/wallExtrusion3D.js';
import * as THREE from 'three';

const wall = (id, points, thickness = 0.1) => createWallDefinition({ id, points, thickness, height: 2.4 });
const area = (rings) => rings.reduce((sum, ring) => sum + wallRingArea(ring), 0);
const footprint = (walls, options) => buildResolvedWallFootprint(walls, options);

test('L ortogonal y diagonal producen una huella conectada sin mutar puntos', () => {
  for (const end of [{ x: 0, z: 2 }, { x: 2, z: 2 }]) {
    const walls = [wall('A', [{ x: -2, z: 0 }, { x: 0, z: 0 }]), wall('B', [{ x: 0, z: 0 }, end])];
    const before = JSON.stringify(walls);
    const resolved = footprint(walls);
    assert.equal(resolved.rings.length, 1);
    assert.ok(area(resolved.rings) > 0);
    assert.equal(JSON.stringify(walls), before);
    assert.deepEqual(buildResolvedWallVolumes3D(walls)[0].rings, resolved.rings);
  }
});

test('T y X ortogonales y diagonales se fusionan en huella y volumen', () => {
  const cases = [
    [wall('H', [{ x: -2, z: 0 }, { x: 2, z: 0 }], 0.2), wall('T', [{ x: 0, z: 0 }, { x: 0, z: 2 }])],
    [wall('H', [{ x: -2, z: 0 }, { x: 2, z: 0 }], 0.2), wall('X', [{ x: 0, z: -2 }, { x: 0, z: 2 }])],
    [wall('H', [{ x: -2, z: -2 }, { x: 2, z: 2 }], 0.2), wall('T', [{ x: 0, z: 0 }, { x: -2, z: 2 }])],
    [wall('H', [{ x: -2, z: -2 }, { x: 2, z: 2 }], 0.2), wall('X', [{ x: -2, z: 2 }, { x: 2, z: -2 }])],
  ];
  for (const walls of cases) {
    const resolved = footprint(walls);
    assert.equal(resolved.rings.length, 1);
    assert.ok(area(resolved.rings) > 0);
    assert.deepEqual(buildResolvedWallVolumes3D(walls)[0].rings, resolved.rings);
  }
});

test('tres y cuatro muros comparten una sola huella', () => {
  const rays = [
    wall('E', [{ x: 0, z: 0 }, { x: 2, z: 0 }]),
    wall('N', [{ x: 0, z: 0 }, { x: 0, z: 2 }]),
    wall('W', [{ x: 0, z: 0 }, { x: -2, z: 0 }]),
    wall('S', [{ x: 0, z: 0 }, { x: 0, z: -2 }]),
  ];
  assert.equal(footprint(rays.slice(0, 3)).rings.length, 1);
  assert.equal(footprint(rays).rings.length, 1);
});

test('paralelos separados no se unen; coincidencia parcial tampoco duplica área', () => {
  const first = wall('A', [{ x: 0, z: 0 }, { x: 3, z: 0 }]);
  const parallel = wall('B', [{ x: 0, z: 0.3 }, { x: 3, z: 0.3 }]);
  assert.equal(footprint([first, parallel]).rings.length, 2);
  const overlap = wall('B', [{ x: 1, z: 0 }, { x: 4, z: 0 }]);
  assert.equal(footprint([first, overlap]).rings.length, 1);
  assert.ok(Math.abs(area(footprint([first, overlap]).rings) - 0.4) < 1e-6);
});

test('multisegmento, extremos, centro y diagonales 15/30/45/60 mantienen identidad', () => {
  const multi = wall('MULTI', [{ id: 'p1', x: 0, z: 0 }, { id: 'p2', x: 2, z: 0 }, { id: 'p3', x: 2, z: 2 }]);
  assert.equal(footprint([multi]).rings.length, 1);
  for (const degrees of [15, 30, 45, 60]) {
    const radians = degrees * Math.PI / 180;
    const diagonal = wall(`D${degrees}`, [{ x: -1, z: 0 }, { x: Math.cos(radians), z: Math.sin(radians) }]);
    assert.ok(footprint([diagonal]).rings.length >= 1);
  }
  const nearEnd = wall('END', [{ x: 2, z: 0 }, { x: 2, z: 1 }]);
  const center = wall('CENTER', [{ x: 1, z: 0 }, { x: 1, z: 1 }]);
  assert.equal(footprint([multi, nearEnd]).rings.length, 1);
  assert.equal(footprint([multi, center]).rings.length, 1);
  const restored = deserializeWalls({ architecture: { walls: serializeWalls([multi]) } });
  assert.deepEqual(restored[0].points, multi.points);
});

test('abertura y encuentro conservan hueco solo en su intervalo vertical', () => {
  const host = wall('HOST', [{ id: 'a', x: 0, z: 0 }, { id: 'b', x: 4, z: 0 }], 0.15);
  const crossing = wall('CROSS', [{ x: 3.5, z: 0 }, { x: 3.5, z: 2 }]);
  const segmentId = buildWallGeometry2D(host).segmentsGeometry[0].segmentId;
  const opening = createDoorDefinition({ wallId: host.id, segmentId, offset: 1, width: 0.8, height: 2.1 });
  const volumes = buildResolvedWallVolumes3D([host, crossing], { openings: [opening] });
  assert.ok(volumes.length >= 2);
  assert.ok(area(volumes[0].rings) < area(volumes.at(-1).rings));
  assert.equal(opening.segmentId, segmentId);
  const meshes = volumes.map((volume) => {
    const mesh = new THREE.Mesh(createWallVolumeGeometry(volume), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }));
    mesh.position.y = volume.baseElevation;
    mesh.updateMatrixWorld(true);
    return mesh;
  });
  const throughDoor = new THREE.Raycaster(new THREE.Vector3(1, 1, 1), new THREE.Vector3(0, 0, -1), 0, 2);
  const throughLintel = new THREE.Raycaster(new THREE.Vector3(1, 2.3, 1), new THREE.Vector3(0, 0, -1), 0, 2);
  assert.equal(throughDoor.intersectObjects(meshes).length, 0);
  assert.ok(throughLintel.intersectObjects(meshes).length > 0);
  meshes.forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose(); });
});

test('extrusión Three.js ocupa la misma huella X/Z y la altura resuelta', () => {
  const walls = [wall('A', [{ x: -2, z: 0 }, { x: 2, z: 0 }], 0.2),
    wall('B', [{ x: 0, z: -2 }, { x: 0, z: 2 }], 0.1)];
  const volume = buildResolvedWallVolumes3D(walls)[0];
  const geometry = createWallVolumeGeometry(volume);
  geometry.computeBoundingBox();
  const points = volume.rings.flat();
  assert.ok(Math.abs(geometry.boundingBox.min.x - Math.min(...points.map((point) => point.x))) < 1e-6);
  assert.ok(Math.abs(geometry.boundingBox.max.x - Math.max(...points.map((point) => point.x))) < 1e-6);
  assert.ok(Math.abs(geometry.boundingBox.min.z - Math.min(...points.map((point) => point.z))) < 1e-6);
  assert.ok(Math.abs(geometry.boundingBox.max.z - Math.max(...points.map((point) => point.z))) < 1e-6);
  assert.ok(Math.abs(geometry.boundingBox.max.y - volume.height) < 1e-6);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  const ray = new THREE.Raycaster(new THREE.Vector3(1, 5, 0), new THREE.Vector3(0, -1, 0));
  assert.ok(ray.intersectObject(mesh).length > 0);
  mesh.material.dispose();
  geometry.dispose();
});

test('un recinto cerrado conserva el hueco interior en planta y en la extrusión', () => {
  const walls = [
    wall('BOTTOM', [{ x: 0, z: 0 }, { x: 4, z: 0 }], 0.2),
    wall('RIGHT', [{ x: 4, z: 0 }, { x: 4, z: 4 }], 0.2),
    wall('TOP', [{ x: 4, z: 4 }, { x: 0, z: 4 }], 0.2),
    wall('LEFT', [{ x: 0, z: 4 }, { x: 0, z: 0 }], 0.2),
  ];
  const resolved = footprint(walls);
  assert.equal(resolved.rings.filter((ring) => wallRingArea(ring) > 0).length, 1);
  assert.equal(resolved.rings.filter((ring) => wallRingArea(ring) < 0).length, 1);
  const geometry = createWallVolumeGeometry(buildResolvedWallVolumes3D(walls)[0]);
  assert.ok(geometry.getAttribute('position').count > 0);
  geometry.dispose();
});

test('muros con elevaciones separadas no crean uniones fantasma por estrato', () => {
  const low = wall('LOW', [{ x: -2, z: 0 }, { x: 2, z: 0 }]);
  const high = { ...wall('HIGH', [{ x: 0, z: -2 }, { x: 0, z: 2 }]), baseElevation: 3 };
  const volumes = buildResolvedWallVolumes3D([low, high]);
  assert.equal(volumes.length, 2);
  assert.deepEqual(volumes[0].wallIds, ['LOW']);
  assert.deepEqual(volumes[1].wallIds, ['HIGH']);
  assert.equal(volumes[0].rings.length, 1);
  assert.equal(volumes[1].rings.length, 1);
});
