import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  normalizeArchitectureFinish, restoreArchitectureFinishes, setArchitectureFinish,
  paintArchitectureRgb, buildExclusiveWallRgbFootprints,
} from '../src/specialFinishes/architectureSpecialFinishes.js';
import { buildResolvedWallFootprint } from '../src/core/architecture/walls/wallResolvedFootprint.js';
import { createWallDefinition, resizeWallSegment } from '../src/core/architecture/walls/wallDefinition.js';
import { buildResolvedWallVolumes3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { createWallVolumeGeometry } from '../src/core/architecture/walls/wallExtrusion3D.js';
import { getWallFinishSurfaces } from '../src/core/architecture/walls/wallFinishSurfaces3D.js';
import { HistoryManager } from '../src/history/historyManager.js';
import { ARCHITECTURE_FINISH_HISTORY_TYPE } from '../src/specialFinishes/architectureSpecialFinishes.js';

const id = '123e4567-e89b-42d3-a456-426614174000';
function finish(entityType, entityId, r = 220) {
  return { source: 'SPECIAL_FINISH', specialFinishId: id, revision: 1,
    entityType, entityId, scope: 'ENTITY',
    snapshot: { specialFinishId: id, revision: 1, name: 'Rojo', type: 'RGB', r, g: 20, b: 30 } };
}

test('restaura solo RGB de entidades existentes y conserva el snapshot', () => {
  const wall = finish('WALL', 'w1');
  assert.deepEqual(normalizeArchitectureFinish(wall), wall);
  const project = { specialFinishes: [wall, finish('COLUMN', 'c1'), finish('WALL', 'ausente'),
    { ...wall, entityId: 'w2', snapshot: { ...wall.snapshot, type: 'TEXTURE' } }] };
  assert.deepEqual(restoreArchitectureFinishes(project, [{ id: 'w1' }], [{ id: 'c1' }]),
    [wall, finish('COLUMN', 'c1')]);
  assert.deepEqual(setArchitectureFinish([wall], 'WALL', 'w1', null), []);
});

test('proyecto JSON conserva RGB archivado y revisión original sin consultar catálogo', () => {
  const old = finish('WALL', 'W1');
  const newer = { ...old, revision: 2, snapshot: { ...old.snapshot, revision: 2, r: 0 } };
  const saved = JSON.parse(JSON.stringify({ specialFinishes: [old] }));
  assert.deepEqual(restoreArchitectureFinishes(saved, [{ id: 'W1' }], []), [old]);
  assert.notDeepEqual(restoreArchitectureFinishes(saved, [{ id: 'W1' }], []), [newer]);
});

test('persistencia de W1 rojo y W2 azul conserva cada wallId', () => {
  const red = finish('WALL', 'W1');
  const blue = { ...finish('WALL', 'W2'),
    snapshot: { ...finish('WALL', 'W2').snapshot, r: 0, g: 0, b: 255 } };
  const saved = JSON.parse(JSON.stringify({ specialFinishes: [red, blue] }));
  assert.deepEqual(restoreArchitectureFinishes(saved, [{ id: 'W1' }, { id: 'W2' }]), [red, blue]);
});

test('pinta solo grupos exclusivos y recupera el color base al retirar el acabado', () => {
  const walls = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  geometry.userData.wallFinishClasses = [
    { type: 'EXCLUSIVE', wallIds: ['w1'] }, { type: 'SHARED', wallIds: ['w1', 'w2'] }];
  geometry.userData.wallFinishGroups = [
    { start: 0, count: 3, materialIndex: 0 }, { start: 3, count: 3, materialIndex: 1 }];
  const materials = [new THREE.MeshStandardMaterial({ color: 0xdddddd }),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })];
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.userData.kind = 'WALL';
  walls.add(mesh);
  paintArchitectureRgb(walls, null, [finish('WALL', 'w1')]);
  assert.equal(materials[0].color.getHex(THREE.SRGBColorSpace), 0xdc141e);
  assert.equal(materials[1].color.getHex(THREE.SRGBColorSpace), 0xdddddd);
  paintArchitectureRgb(walls, null, []);
  assert.equal(materials[0].color.getHex(THREE.SRGBColorSpace), 0xdddddd);
});

test('huella 2D RGB conserva atribución exclusiva del muro', () => {
  const walls = [
    { id: 'w1', points: [{ x: 0, z: 0 }, { x: 2, z: 0 }], thickness: 0.2, height: 2.4 },
    { id: 'w2', points: [{ x: 1, z: -1 }, { x: 1, z: 1 }], thickness: 0.2, height: 2.4 },
  ];
  const footprint = buildResolvedWallFootprint(walls);
  const patches = buildExclusiveWallRgbFootprints(footprint, [finish('WALL', 'w1')]);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].wallId, 'w1');
  assert.equal(patches[0].color, 'rgb(220, 20, 30)');
  assert.ok(patches[0].rings.length > 0);
});

function wall(id, points, thickness = 0.2) {
  return createWallDefinition({ id, thickness, height: 2.4,
    points: points.map(([x, z], index) => ({ id: `${id}-${index}`, x, z })) });
}

function renderedWalls(definitions) {
  const group = new THREE.Group();
  for (const volume of buildResolvedWallVolumes3D(definitions)) {
    const geometry = createWallVolumeGeometry(volume);
    const materials = geometry.userData.wallFinishClasses.map(() =>
      new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.userData.kind = 'WALL';
    group.add(mesh);
  }
  return group;
}

function assertWallColors(group, expected) {
  for (const mesh of group.children) {
    const classes = mesh.geometry.userData.wallFinishClasses;
    for (const [index, classification] of classes.entries()) {
      const actual = mesh.material[index].color.getHex(THREE.SRGBColorSpace);
      const desired = classification.type === 'EXCLUSIVE'
        ? expected[classification.wallIds[0]] || 0xdddddd : 0xdddddd;
      assert.equal(actual, desired, `${classification.type}:${classification.wallIds.join(',')}`);
    }
  }
}

test('prueba crítica: W1 rojo, W2 azul y SHARED base, incluso tras reconstrucción', () => {
  const first = wall('W1', [[-2, 0], [2, 0]]);
  const second = wall('W2', [[0, -2], [0, 2]]);
  const entries = [finish('WALL', 'W1', 220),
    { ...finish('WALL', 'W2', 0), snapshot: { ...finish('WALL', 'W2', 0).snapshot, g: 0, b: 255 } }];
  for (const definitions of [[first, second], [resizeWallSegment(first, 0, 5), second]]) {
    const group = renderedWalls(definitions);
    assert.ok(getWallFinishSurfaces(group, 'W1').length);
    assert.ok(getWallFinishSurfaces(group, 'W2').length);
    paintArchitectureRgb(group, null, entries);
    assertWallColors(group, { W1: 0xdc141e, W2: 0x0000ff });
  }
});

test('columna RGB usa columnId y no modifica otras columnas', () => {
  const group = new THREE.Group();
  for (const columnId of ['C1', 'C2']) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshStandardMaterial({ color: 0xb7b7b7 }));
    mesh.userData = { kind: 'COLUMN', columnId };
    group.add(mesh);
  }
  paintArchitectureRgb(null, group, [finish('COLUMN', 'C1')]);
  assert.equal(group.children[0].material.color.getHex(THREE.SRGBColorSpace), 0xdc141e);
  assert.equal(group.children[1].material.color.getHex(THREE.SRGBColorSpace), 0xb7b7b7);
  const rebuilt = group.children[0].clone();
  rebuilt.material = new THREE.MeshStandardMaterial({ color: 0xb7b7b7 });
  group.remove(group.children[0]);
  group.add(rebuilt);
  paintArchitectureRgb(null, group, [finish('COLUMN', 'C1')]);
  assert.equal(rebuilt.material.color.getHex(THREE.SRGBColorSpace), 0xdc141e);
});

test('historial global revierte y rehace RGB de muro y columna, incluido cambio de color', async () => {
  let entries = [];
  const history = new HistoryManager({ replayAction: (action, direction) => {
    entries = setArchitectureFinish(entries, action.entityType, action.entityId,
      direction === 'undo' ? action.before : action.after);
  } });
  for (const [entityType, entityId] of [['WALL', 'W1'], ['COLUMN', 'C1']]) {
    const red = finish(entityType, entityId);
    entries = setArchitectureFinish(entries, entityType, entityId, red);
    history.pushAction({ type: ARCHITECTURE_FINISH_HISTORY_TYPE, entityType, entityId,
      before: null, after: red });
    await history.undo();
    assert.equal(entries.length, 0);
    await history.redo();
    assert.deepEqual(entries, [red]);
    entries = [];
    history.clearHistory();
  }
  const red = finish('WALL', 'W1');
  const blue = { ...red, snapshot: { ...red.snapshot, r: 0, g: 0, b: 255 } };
  entries = [blue];
  history.pushAction({ type: ARCHITECTURE_FINISH_HISTORY_TYPE,
    entityType: 'WALL', entityId: 'W1', before: red, after: blue });
  await history.undo();
  assert.deepEqual(entries, [red]);
  await history.redo();
  assert.deepEqual(entries, [blue]);
});
