import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { patchCritterium8TileConfig } from '../src/mepal/critterium8/integration/critterium8Config.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';
import { normalizeCritterium8TileFaces, CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE } from '../src/mepal/critterium8/composition/tileFaces.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

const config = { widthCm: 90, heightCm: 90, frameMode: 'HALF_HEIGHT', compositionMode: 'MODULAR' };
const tiles = (instance) => instance.assembly.userData.composition.tileSlots;
const tileParts = (instance, slotId) => instance.parts.filter((part) => part.type === 'TILE' && part.slotId === slotId);

test('new frames persist two Natural Elm faces in every slot', async () => {
  const instance = await createCritterium8Instance({ ...config, frameId: 'DEFAULT_FACE', initializeDefaultTiles: true });
  assert.equal(tiles(instance).length, 2);
  for (const slot of tiles(instance)) {
    assert.equal(slot.tile.tileType, 'FORMICA');
    assert.equal(slot.tile.faces.FRONT.materialCode, CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE);
    assert.equal(slot.tile.faces.BACK.materialCode, CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE);
    assert.equal(slot.tile.faces.FRONT.enabled, true);
    assert.equal(slot.tile.faces.BACK.enabled, true);
    assert.equal(tileParts(instance, slot.id).length, 2);
  }
  assert.equal(instance.assembly.userData.config.tiles.length, 2);
});

test('faces change independently and one face is centered in the 80 mm frame', async () => {
  const initial = await createCritterium8Instance({ ...config, frameId: 'SINGLE_FACE', initializeDefaultTiles: true });
  const slotId = tiles(initial)[0].id;
  const changed = patchCritterium8TileConfig({ config: initial.assembly.userData.config, frameId: 'SINGLE_FACE', slotId,
    patch: { faces: { BACK: { materialCode: '22015171', rgbValue: '205_183_160' } } } });
  assert.equal(changed.success, true, changed.reason);
  assert.equal(changed.config.tiles[0].faces.FRONT.materialCode, CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE);
  assert.equal(changed.config.tiles[0].faces.BACK.materialCode, '22015171');
  const both = await createCritterium8Instance({ ...changed.config, frameId: 'SINGLE_FACE' });
  const bothParts = tileParts(both, slotId);
  assert.equal(bothParts.length, 2);
  const bothPlacements = bothParts.map((part) => both.layout.placements.find((item) => item.partId === part.id));
  assert.ok(bothPlacements[0].position.z > 0);
  assert.ok(bothPlacements[1].position.z < 0);
  const oneFace = patchCritterium8TileConfig({ config: changed.config, frameId: 'SINGLE_FACE', slotId,
    patch: { faces: { BACK: { enabled: false } } } });
  assert.equal(oneFace.success, true, oneFace.reason);
  const single = await createCritterium8Instance({ ...oneFace.config, frameId: 'SINGLE_FACE' });
  const singleParts = tileParts(single, slotId);
  assert.equal(singleParts.length, 1);
  const placement = single.layout.placements.find((item) => item.partId === singleParts[0].id);
  assert.equal(placement.position.z, 0);
  assert.equal(single.assembly.userData.bounds2d.sizeLocal[2], 0.08);
  const box = new THREE.Box3().setFromObject(single.assembly);
  assert.ok(box.min.z >= -0.04 - 1e-6 && box.max.z <= 0.04 + 1e-6);
  const bom = resolveCritterium8BOM([{ obj: single.assembly }]);
  assert.equal(bom.rows.filter((row) => row.sourceId === slotId).reduce((sum, row) => sum + row.qty, 0), 1);
  const restored = await createCritterium8Instance({ ...structuredClone(oneFace.config), frameId: 'SINGLE_FACE' });
  assert.deepEqual(restored.assembly.userData.config.tiles, oneFace.config.tiles);
  assert.equal(tileParts(restored, slotId).length, 1);
  assert.equal(changed.config.tiles[0].faces.BACK.enabled, true);
});

test('legacy tile assignments retain two equal faces and empty legacy slots stay empty', async () => {
  const legacy = await createCritterium8Instance({ ...config, frameId: 'LEGACY', tiles: [{ tileType: 'FORMICA', heightCm: 38, materialCode: '22015170' }] });
  assert.deepEqual(normalizeCritterium8TileFaces(tiles(legacy)[0].tile).FRONT,
    normalizeCritterium8TileFaces(tiles(legacy)[0].tile).BACK);
  assert.equal(tileParts(legacy, tiles(legacy)[0].id).length, 2);
  const empty = await createCritterium8Instance({ ...config, frameId: 'LEGACY_EMPTY', tiles: [] });
  assert.ok(tiles(empty).every((slot) => slot.tile === null));
});

test('duplicated slot face objects are independent', async () => {
  const initial = await createCritterium8Instance({ ...config, frameId: 'DUP_FACE', initializeDefaultTiles: true });
  const copied = structuredClone(initial.assembly.userData.config.tiles);
  copied[1].faces.BACK.materialCode = '22015171';
  assert.equal(copied[0].faces.BACK.materialCode, CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE);
  assert.equal(initial.assembly.userData.config.tiles[1].faces.BACK.materialCode, CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE);
});

test('global history restores face materials and enabled state through configuration rebuild', async () => {
  const initial = await createCritterium8Instance({ ...config, frameId: 'HISTORY_FACE', initializeDefaultTiles: true });
  const slotId = tiles(initial)[0].id;
  let current = structuredClone(initial.assembly.userData.config);
  const history = createHistoryManager({ replayAction: async (action, direction) => {
    const restored = await createCritterium8Instance({ ...(direction === 'undo' ? action.before : action.after), frameId: 'HISTORY_FACE' });
    current = structuredClone(restored.assembly.userData.config);
  } });
  const edit = (patch) => {
    const before = structuredClone(current);
    const result = patchCritterium8TileConfig({ config: current, frameId: 'HISTORY_FACE', slotId, patch });
    assert.equal(result.success, true, result.reason);
    current = structuredClone(result.config);
    history.pushAction({ type: HISTORY_ACTION_TYPES.CRITTERIUM_8_CONFIG_CHANGE, before, after: structuredClone(current) });
  };
  edit({ faces: { FRONT: { materialCode: '22015171' } } });
  edit({ faces: { BACK: { enabled: false } } });
  assert.equal(current.tiles[0].faces.FRONT.materialCode, '22015171');
  assert.equal(current.tiles[0].faces.BACK.enabled, false);
  await history.undo();
  assert.equal(current.tiles[0].faces.BACK.enabled, true);
  await history.undo();
  assert.equal(current.tiles[0].faces.FRONT.materialCode, CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE);
  await history.redo();
  await history.redo();
  assert.equal(current.tiles[0].faces.FRONT.materialCode, '22015171');
  assert.equal(current.tiles[0].faces.BACK.enabled, false);
});
