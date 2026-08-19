import test from 'node:test';
import assert from 'node:assert/strict';

import { createCritterium8FrameDefinition } from '../src/mepal/critterium8/definitions/frameDefinition.js';
import {
  applyGrowthModuleToComposition,
  buildCritterium8FrameComposition,
  rebuildCritterium8FrameComposition,
} from '../src/mepal/critterium8/composition/frameComposition.js';
import { validateFrameComposition } from '../src/mepal/critterium8/rules/frameCompositionRules.js';

test('compone documentalmente frames 90, 110, 128, 166 y 204', () => {
  const expected = new Map([[90, [38, 38]], [110, [38, 38, 20]], [128, [38, 38, 38]], [166, [38, 38, 38, 38]], [204, [38, 38, 38, 38, 38]]]);
  for (const [heightCm, slots] of expected) {
    const frame = createCritterium8FrameDefinition({ id: `F${heightCm}`, widthCm: 60, heightCm });
    const composition = buildCritterium8FrameComposition(frame);
    assert.deepEqual(composition.tileSlots.map((slot) => slot.heightCm), slots);
    assert.equal(validateFrameComposition(frame, composition).valid, true);
    assert.equal(composition.usableTileHeightCm + composition.plinth.heightCm, heightCm);
  }
});

test('genera IDs de slot estables', () => {
  const frame = createCritterium8FrameDefinition({ id: 'FRAME_A', widthCm: 60, heightCm: 90 });
  const first = buildCritterium8FrameComposition(frame);
  const second = buildCritterium8FrameComposition(frame);
  assert.deepEqual(first.tileSlots.map((slot) => slot.id), ['C8_SLOT_FRAME_A_0', 'C8_SLOT_FRAME_A_1']);
  assert.deepEqual(first.tileSlots.map((slot) => slot.id), second.tileSlots.map((slot) => slot.id));
});

test('valida baldosa 38 y rechaza tipo o ancho incompatible', () => {
  const validFrame = createCritterium8FrameDefinition({ id: 'VALID', widthCm: 60, heightCm: 90, tiles: [{ tileType: 'FORMICA', heightCm: 38 }] });
  assert.equal(validateFrameComposition(validFrame, buildCritterium8FrameComposition(validFrame)).valid, true);
  const invalidFrame = createCritterium8FrameDefinition({ id: 'INVALID', widthCm: 30, heightCm: 90, tiles: [{ tileType: 'PORT', heightCm: 38 }] });
  assert.equal(validateFrameComposition(invalidFrame, buildCritterium8FrameComposition(invalidFrame)).valid, false);
});

test('revalida asignaciones al cambiar ancho', () => {
  const original = createCritterium8FrameDefinition({ id: 'WIDTH', widthCm: 60, heightCm: 90, tiles: [{ tileType: 'PORT', heightCm: 38 }] });
  const previous = buildCritterium8FrameComposition(original);
  const changed = createCritterium8FrameDefinition({ ...original, widthCm: 30, tiles: original.tiles });
  const result = rebuildCritterium8FrameComposition(changed, previous);
  assert.equal(validateFrameComposition(changed, result.composition).valid, false);
});

test('modela baldosas plenas 76, 114, 152 y 190 explícitamente', () => {
  for (const [heightCm, fullHeight] of [[90, 76], [128, 114], [166, 152], [204, 190]]) {
    const frame = createCritterium8FrameDefinition({ id: `FULL_${heightCm}`, widthCm: 60, heightCm, compositionMode: 'FULL_TILE', tiles: [{ tileType: 'SINGLE_GLASS', heightCm: fullHeight }] });
    const composition = buildCritterium8FrameComposition(frame);
    assert.deepEqual(composition.tileSlots.map((slot) => slot.heightCm), [fullHeight]);
    assert.equal(validateFrameComposition(frame, composition).valid, true);
  }
});

test('permite familias documentadas de baldosa plena', () => {
  for (const tileType of ['FORMICA', 'FABRIC']) {
    const frame = createCritterium8FrameDefinition({ id: `FULL_${tileType}`, widthCm: 60, heightCm: 204, compositionMode: 'FULL_TILE', tiles: [{ tileType, heightCm: 190 }] });
    assert.equal(validateFrameComposition(frame, buildCritterium8FrameComposition(frame)).valid, true);
  }
});

test('rechaza FULL_TILE no documentada para 110', () => {
  const frame = createCritterium8FrameDefinition({ widthCm: 60, heightCm: 110, compositionMode: 'FULL_TILE' });
  assert.equal(validateFrameComposition(frame, buildCritterium8FrameComposition(frame)).valid, false);
});

test('aplica crecimiento documentado y rechaza superar 204', () => {
  const frame = createCritterium8FrameDefinition({ id: 'GROW', widthCm: 60, heightCm: 90 });
  const composition = buildCritterium8FrameComposition(frame);
  const valid = applyGrowthModuleToComposition(frame, composition, { moduleCount: 3 });
  assert.equal(valid.valid, true);
  assert.equal(valid.composition.heightCm, 204);
  assert.equal(valid.composition.growthModules.length, 3);
  assert.equal(applyGrowthModuleToComposition(frame, composition, { moduleCount: 4 }).valid, false);
  const undocumentedWidth = createCritterium8FrameDefinition({ id: 'GROW_30', widthCm: 30, heightCm: 90 });
  assert.equal(applyGrowthModuleToComposition(undocumentedWidth, buildCritterium8FrameComposition(undocumentedWidth)).valid, false);
});

test('FLOOR_TO_CEILING conserva base 204 y frame inválido diagnostica', () => {
  const frame = createCritterium8FrameDefinition({ id: 'FTC', frameMode: 'FLOOR_TO_CEILING', widthCm: 60, heightCm: 280 });
  const composition = buildCritterium8FrameComposition(frame);
  assert.equal(composition.heightCm, 204);
  assert.equal(composition.projectHeightCm, 280);
  assert.equal(composition.tileSlots.length, 5);
  const invalid = buildCritterium8FrameComposition({ id: 'BAD', widthCm: 60, heightCm: 100 });
  assert.equal(invalid.diagnostics.some((item) => item.level === 'ERROR'), true);
});
