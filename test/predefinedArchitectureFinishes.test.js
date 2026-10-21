import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { predefinedCatalog } from '../server/src/specialFinishes/predefinedCatalog.js';
import { createWallDefinition } from '../src/core/architecture/walls/wallDefinition.js';
import { buildResolvedWallVolumes3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { createWallVolumeGeometry } from '../src/core/architecture/walls/wallExtrusion3D.js';
import { snapshotSpecialFinish } from '../src/specialFinishes/specialFinishPersistence.js';
import { ARCHITECTURE_FINISH_HISTORY_TYPE, findArchitectureFinish,
  paintArchitectureFinishTarget, restoreArchitectureFinishes, setArchitectureFinish } from
  '../src/specialFinishes/architectureSpecialFinishes.js';
import { HistoryManager } from '../src/history/historyManager.js';

function definition(id, start, end) {
  return createWallDefinition({ id, thickness: 0.2, height: 2.5,
    points: [{ id: `${id}-1`, x: start[0], z: start[1] },
      { id: `${id}-2`, x: end[0], z: end[1] }] });
}

function wallGroup(walls) {
  const group = new THREE.Group();
  for (const volume of buildResolvedWallVolumes3D(walls)) {
    const geometry = createWallVolumeGeometry(volume);
    const materials = geometry.userData.wallFinishClasses.map(() =>
      new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.userData.kind = 'WALL';
    mesh.userData.wallTextureSources = volume.sources;
    mesh.position.y = volume.baseElevation;
    group.add(mesh);
  }
  return group;
}

function assignment(finish, entityType, entityId) {
  const snapshot = snapshotSpecialFinish(finish);
  return { source: 'SPECIAL_FINISH', specialFinishId: snapshot.specialFinishId,
    revision: snapshot.revision, snapshot, entityType, entityId, scope: 'ENTITY',
    textureScale: { tileWidth: finish.suggestedTileWidth } };
}

test('Ladrillo y Piedra usan el mismo motor y respetan EXCLUSIVE/SHARED en X', async () => {
  const [brick, , , stone] = predefinedCatalog.list().items;
  const walls = [definition('W1', [-2, 0], [2, 0]), definition('W2', [0, -2], [0, 2])];
  const group = wallGroup(walls);
  const entries = [assignment(brick, 'WALL', 'W1'), assignment(stone, 'WALL', 'W2')];
  const maps = new Map([[brick.id, new THREE.Texture({ width: 512, height: 512 })],
    [stone.id, new THREE.Texture({ width: 512, height: 512 })]]);
  const prepareVisual = async (finish) => ({ definition: { mapTexture: maps.get(finish.id) } });
  for (const entry of entries) await paintArchitectureFinishTarget(group, null, entries,
    'WALL', entry.entityId, walls, [], { prepareVisual });
  let shared = 0;
  let exclusive = 0;
  for (const mesh of group.children) {
    mesh.geometry.userData.wallFinishClasses.forEach((classification, index) => {
      const expected = classification.type === 'EXCLUSIVE'
        ? maps.get(classification.wallIds[0] === 'W1' ? brick.id : stone.id) : null;
      assert.equal(mesh.material[index].map, expected);
      if (expected) exclusive += 1;
      else shared += 1;
    });
  }
  assert.ok(exclusive > 0);
  assert.ok(shared > 0);
  const saved = JSON.parse(JSON.stringify({ specialFinishes: entries }));
  const restored = restoreArchitectureFinishes(saved, walls);
  assert.deepEqual(restored, entries);
  assert.equal(restored[0].snapshot.assetId, brick.asset.id);
  assert.equal(restored[1].snapshot.assetId, stone.asset.id);
});

test('columnas rectangular y circular conservan dos identidades oficiales independientes', async () => {
  const [brick, , concrete] = predefinedCatalog.list().items;
  const columns = [{ id: 'C1', diameter: 0.5 }, { id: 'C2', diameter: 0.5 }];
  const group = new THREE.Group();
  const first = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xb7b7b7 }));
  const second = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.5, 16),
    new THREE.MeshStandardMaterial({ color: 0xb7b7b7 }));
  first.userData = { kind: 'COLUMN', columnId: 'C1' };
  second.userData = { kind: 'COLUMN', columnId: 'C2' };
  group.add(first, second);
  const entries = [assignment(brick, 'COLUMN', 'C1'), assignment(concrete, 'COLUMN', 'C2')];
  const maps = new Map([[brick.id, new THREE.Texture({ width: 512, height: 512 })],
    [concrete.id, new THREE.Texture({ width: 512, height: 512 })]]);
  const prepareVisual = async (finish) => ({ definition: { mapTexture: maps.get(finish.id) } });
  for (const entry of entries) await paintArchitectureFinishTarget(null, group, entries,
    'COLUMN', entry.entityId, [], columns, { prepareVisual });
  assert.equal(first.material.map, maps.get(brick.id));
  assert.equal(second.material.map, maps.get(concrete.id));
  assert.notEqual(first.material.map, second.material.map);
});

test('historial conserva textura oficial al alternar con RGB y entre dos oficiales', async () => {
  const [brick, , , stone] = predefinedCatalog.list().items;
  const first = assignment(brick, 'WALL', 'W1');
  const second = assignment(stone, 'WALL', 'W1');
  const rgb = { ...first, textureScale: undefined,
    snapshot: { specialFinishId: '123e4567-e89b-42d3-a456-426614174000', revision: 1,
      name: 'Rojo', type: 'RGB', r: 255, g: 0, b: 0 },
    specialFinishId: '123e4567-e89b-42d3-a456-426614174000' };
  let entries = [first];
  const history = new HistoryManager({ replayAction: (action, direction) => {
    entries = setArchitectureFinish(entries, action.entityType, action.entityId,
      direction === 'undo' ? action.before : action.after);
  } });
  for (const next of [second, rgb]) {
    const before = findArchitectureFinish(entries, 'WALL', 'W1');
    entries = setArchitectureFinish(entries, 'WALL', 'W1', next);
    history.pushAction({ type: ARCHITECTURE_FINISH_HISTORY_TYPE,
      entityType: 'WALL', entityId: 'W1', before, after: next });
    await history.undo();
    assert.equal(findArchitectureFinish(entries, 'WALL', 'W1').specialFinishId, before.specialFinishId);
    await history.redo();
    assert.equal(findArchitectureFinish(entries, 'WALL', 'W1').specialFinishId, next.specialFinishId);
  }
});
