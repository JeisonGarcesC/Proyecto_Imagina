import test from 'node:test';
import assert from 'node:assert/strict';

import { createCritterium8FrameDefinition } from '../src/mepal/critterium8/definitions/frameDefinition.js';
import { applyGrowthModuleToComposition, buildCritterium8FrameComposition } from '../src/mepal/critterium8/composition/frameComposition.js';
import { resolveCritterium8FrameParts } from '../src/mepal/critterium8/parts/framePartResolver.js';
import { buildCritterium8FrameAssemblyLayout } from '../src/mepal/critterium8/layout/frameLayoutBuilder.js';
import { validateCritterium8AssemblyLayout } from '../src/mepal/critterium8/rules/layoutRules.js';

function build(frame) {
  const composition = buildCritterium8FrameComposition(frame);
  const parts = resolveCritterium8FrameParts(frame, { composition }).parts;
  return { composition, parts, layout: buildCritterium8FrameAssemblyLayout({ frame, composition, parts }) };
}

test('construye layouts válidos para 90, 110, 128, 166 y 204', () => {
  for (const heightCm of [90, 110, 128, 166, 204]) {
    const frame = createCritterium8FrameDefinition({ id: `L${heightCm}`, widthCm: 60, heightCm });
    const { composition, parts, layout } = build(frame);
    assert.equal(layout.valid, true);
    assert.equal(validateCritterium8AssemblyLayout(layout, { frame, composition, parts }).valid, true);
    assert.deepEqual(layout.bounds, { minX: -30, maxX: 30, minY: 0, maxY: heightCm, minZ: -4, maxZ: 4 });
    assert.equal(layout.placements.find((item) => item.partType === 'BOTTOM_PLINTH').position.y, 7);
    assert.equal(layout.placements.find((item) => item.partType === 'TOP_BEVEL').position.y, heightCm);
    assert.equal(layout.placements.find((item) => item.partType === 'FRAME_LEFT_POST').position.x, -30);
    assert.equal(layout.placements.find((item) => item.partType === 'FRAME_RIGHT_POST').position.x, 30);
  }
});

test('posiciona tiles de 38 y 20 mediante slots', () => {
  const frame = createCritterium8FrameDefinition({ id: 'TILE_LAYOUT', widthCm: 60, heightCm: 110, tiles: [{ tileType: 'FORMICA', heightCm: 38 }, { tileType: 'FORMICA', heightCm: 38 }, { tileType: 'FORMICA', heightCm: 20 }] });
  const { layout } = build(frame);
  const tiles = layout.placements.filter((item) => item.partType === 'TILE');
  assert.deepEqual(tiles.map((item) => item.position.y), [33, 71, 100]);
  assert.equal(tiles.every((item) => item.metadata.tileProjectionCm === 1.5), true);
});

test('FULL_TILE produce una sola placement de baldosa', () => {
  const frame = createCritterium8FrameDefinition({ id: 'FULL', widthCm: 60, heightCm: 204, compositionMode: 'FULL_TILE', tiles: [{ tileType: 'FORMICA', heightCm: 190 }] });
  assert.equal(build(frame).layout.placements.filter((item) => item.partType === 'TILE').length, 1);
});

test('IDs son deterministas y los inputs no se mutan', () => {
  const frame = createCritterium8FrameDefinition({ id: 'IMMUTABLE', widthCm: 60, heightCm: 90 });
  const composition = buildCritterium8FrameComposition(frame);
  const parts = resolveCritterium8FrameParts(frame, { composition }).parts;
  const snapshot = JSON.stringify({ frame, composition, parts });
  const first = buildCritterium8FrameAssemblyLayout({ frame, composition, parts });
  const second = buildCritterium8FrameAssemblyLayout({ frame, composition, parts });
  assert.deepEqual(first.placements.map((item) => item.id), second.placements.map((item) => item.id));
  assert.equal(JSON.stringify({ frame, composition, parts }), snapshot);
});

test('growth se coloca sobre el frame base sin moverlo', () => {
  const baseFrame = createCritterium8FrameDefinition({ id: 'GROW_LAYOUT', widthCm: 60, heightCm: 90 });
  const grown = applyGrowthModuleToComposition(baseFrame, buildCritterium8FrameComposition(baseFrame));
  const parts = resolveCritterium8FrameParts(baseFrame, { composition: grown.composition }).parts;
  const layout = buildCritterium8FrameAssemblyLayout({ frame: { ...baseFrame, heightCm: 128 }, composition: grown.composition, parts });
  assert.equal(layout.placements.find((item) => item.partType === 'FRAME_LEFT_POST').position.y, 45);
  assert.equal(layout.placements.find((item) => item.partType === 'GROWTH_MODULE').position.y, 109);
  assert.equal(layout.placements.find((item) => item.partType === 'TOP_BEVEL').position.y, 128);
});

test('floor-to-ceiling ubica montante sobre 204 y U en altura proyecto', () => {
  const frame = createCritterium8FrameDefinition({ id: 'FTC_LAYOUT', frameMode: 'FLOOR_TO_CEILING', widthCm: 60, heightCm: 280 });
  const { layout } = build(frame);
  assert.equal(layout.placements.find((item) => item.partType === 'CEILING_POST').position.y, 242);
  assert.equal(layout.placements.find((item) => item.partType === 'CEILING_U').position.y, 280);
  assert.equal(layout.anchors.find((anchor) => anchor.type === 'FRAME_TOP_CENTER').position.y, 204);
  assert.equal(layout.placements.find((item) => item.partType === 'TOP_BEVEL').anchorId, 'C8_ANCHOR_FTC_LAYOUT_FRAME_TOP_CENTER');
  assert.equal(layout.valid, true);
});

test('expone anchors y diagnóstico de dimensiones físicas faltantes', () => {
  const frame = createCritterium8FrameDefinition({ id: 'ANCHORS', widthCm: 60, heightCm: 90, tiles: [{ tileType: 'FORMICA', heightCm: 38 }] });
  const { layout } = build(frame);
  assert.equal(layout.anchors.some((anchor) => anchor.type === 'ORIGIN' && anchor.position.y === 0), true);
  assert.equal(layout.anchors.some((anchor) => anchor.type === 'SLOT_CENTER'), true);
  assert.equal(layout.diagnostics.some((item) => item.code === 'MISSING_PHYSICAL_DIMENSIONS'), true);
});
