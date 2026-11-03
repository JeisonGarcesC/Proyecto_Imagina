import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';
import { patchCritterium8TileConfig } from '../src/mepal/critterium8/integration/critterium8Config.js';

const frameConfig = { widthCm: 90, heightCm: 204, frameMode: 'HALF_HEIGHT', compositionMode: 'MODULAR' };
const tileRows = (rows) => rows.filter((row) => row.code === '22191301823');
const qty = (rows) => rows.reduce((sum, row) => sum + row.qty, 0);

test('CET reference: two 204 x 90 frames produce 20 commercial tiles and the documented kits', async () => {
  const scene = new THREE.Scene();
  const frames = [];
  for (const [index, x] of [0.45, 1.35].entries()) {
    const instance = await createCritterium8Instance({ ...frameConfig, frameId: `CET_204_${index}`,
      transform: { position: [x, 0, 0] }, initializeDefaultTiles: true });
    scene.add(instance.assembly);
    frames.push(instance.assembly);
    assert.equal(instance.assembly.userData.composition.tileSlots.length, 5);
    assert.equal(instance.assembly.userData.config.tiles.length, 5);
    assert.equal(instance.parts.filter((part) => part.type === 'TILE').length, 10);
    assert.ok(instance.assembly.userData.config.tiles.every((tile) => tile.commercialOptions.subtype === 'FORMICA'));
  }
  const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(prepared.success, true, prepared.reason);
  const { rows } = resolveCritterium8BOM([...frames, prepared.sequenceRoot].map((obj) => ({ obj })));
  assert.equal(qty(tileRows(rows)), 20);
  assert.equal(new Set(tileRows(rows).map((row) => row.materialCode)).size, 1);
  assert.equal(tileRows(rows)[0].materialCode, '22015170');
  assert.equal(qty(rows.filter((row) => row.code === '22191900025')), 2);
  assert.equal(qty(rows.filter((row) => row.code === '22000014323')), 1);
  assert.equal(qty(rows.filter((row) => row.code === '22191900129')), 2);
});

test('one face, different materials and an empty slot derive BOM from persisted parts', async () => {
  const initial = await createCritterium8Instance({ ...frameConfig, frameId: 'CET_VARIANT', initializeDefaultTiles: true });
  const slotId = initial.assembly.userData.composition.tileSlots[0].id;
  const changed = patchCritterium8TileConfig({ config: initial.assembly.userData.config,
    frameId: 'CET_VARIANT', slotId,
    patch: { faces: { BACK: { materialCode: '22015171' } } } });
  assert.equal(changed.success, true, changed.reason);
  const different = await createCritterium8Instance({ ...changed.config, frameId: 'CET_VARIANT' });
  let rows = resolveCritterium8BOM([{ obj: different.assembly }]).rows;
  assert.equal(qty(tileRows(rows)), 10);
  assert.equal(qty(tileRows(rows).filter((row) => row.materialCode === '22015171')), 1);
  const single = patchCritterium8TileConfig({ config: changed.config, frameId: 'CET_VARIANT', slotId,
    patch: { faces: { BACK: { enabled: false } } } });
  assert.equal(single.success, true, single.reason);
  const oneFace = await createCritterium8Instance({ ...single.config, frameId: 'CET_VARIANT' });
  rows = resolveCritterium8BOM([{ obj: oneFace.assembly }]).rows;
  assert.equal(qty(tileRows(rows)), 9);
  const empty = patchCritterium8TileConfig({ config: single.config, frameId: 'CET_VARIANT', slotId,
    patch: { tileType: '' } });
  assert.equal(empty.success, true, empty.reason);
  const emptySlot = await createCritterium8Instance({ ...empty.config, frameId: 'CET_VARIANT' });
  assert.equal(empty.config.tiles.find((tile) => tile.slotId === slotId)?.empty, true);
  assert.equal(emptySlot.assembly.userData.composition.tileSlots[0].tile, null);
  rows = resolveCritterium8BOM([{ obj: emptySlot.assembly }]).rows;
  assert.equal(qty(tileRows(rows)), 8);
});

test('the Formica variant is only assigned where the catalog requires it', async () => {
  const frame = await createCritterium8Instance({ widthCm: 90, heightCm: 110,
    frameId: 'CET_110', initializeDefaultTiles: true });
  assert.deepEqual(frame.assembly.userData.config.tiles.map((tile) => tile.commercialOptions?.subtype || null),
    ['FORMICA', 'FORMICA', null]);
  const rows = resolveCritterium8BOM([{ obj: frame.assembly }]).rows;
  assert.equal(qty(rows.filter((row) => row.code === '22191301823')), 4);
  assert.equal(qty(rows.filter((row) => row.code === '22191302086')), 2);
});
