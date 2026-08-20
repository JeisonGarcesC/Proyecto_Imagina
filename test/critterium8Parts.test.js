import test from 'node:test';
import assert from 'node:assert/strict';

import { createCritterium8FrameDefinition } from '../src/mepal/critterium8/definitions/frameDefinition.js';
import { applyGrowthModuleToComposition, buildCritterium8FrameComposition } from '../src/mepal/critterium8/composition/frameComposition.js';
import { resolveCritterium8FrameParts, resolveJunctionParts } from '../src/mepal/critterium8/parts/framePartResolver.js';
import { validateResolvedParts } from '../src/mepal/critterium8/parts/partRules.js';

test('resuelve parts estructurales para cada altura documental', () => {
  for (const heightCm of [90, 110, 128, 166, 204]) {
    const frame = createCritterium8FrameDefinition({ id: `FRAME_${heightCm}`, widthCm: 60, heightCm });
    const composition = buildCritterium8FrameComposition(frame);
    const result = resolveCritterium8FrameParts(frame, { composition });
    assert.equal(result.valid, true);
    assert.deepEqual(result.parts.slice(0, 4).map((part) => part.type), ['FRAME_LEFT_POST', 'FRAME_RIGHT_POST', 'BOTTOM_PLINTH', 'TOP_BEVEL']);
    assert.equal(new Set(result.parts.map((part) => part.id)).size, result.parts.length);
    assert.equal(validateResolvedParts(result.parts, { frame, composition }).valid, true);
  }
});

test('frame 110 conserva exactamente un slot de 20 y frame 204 cinco de 38', () => {
  const frame110 = createCritterium8FrameDefinition({ id: 'F110', widthCm: 60, heightCm: 110 });
  const frame204 = createCritterium8FrameDefinition({ id: 'F204', widthCm: 60, heightCm: 204 });
  assert.equal(buildCritterium8FrameComposition(frame110).tileSlots.filter((slot) => slot.heightCm === 20).length, 1);
  assert.equal(buildCritterium8FrameComposition(frame204).tileSlots.filter((slot) => slot.heightCm === 38).length, 5);
});

test('convierte cada TileAssignment en Part con slot y código cuando existe', () => {
  const frame = createCritterium8FrameDefinition({ id: 'TILES', widthCm: 60, heightCm: 90, tiles: [{ tileType: 'FORMICA', heightCm: 38 }, { tileType: 'FORMICA', heightCm: 38 }] });
  const composition = buildCritterium8FrameComposition(frame);
  const result = resolveCritterium8FrameParts(frame, { composition });
  const tiles = result.parts.filter((part) => part.type === 'TILE');
  assert.equal(tiles.length, 2);
  assert.equal(tiles.every((part) => part.slotId && part.code === '22191301822'), true);
  assert.deepEqual(tiles.map((part) => part.id), composition.tileSlots.map((slot) => `C8_PART_${slot.id}`));
});

test('agrega módulo de crecimiento documental', () => {
  const frame = createCritterium8FrameDefinition({ id: 'GROWTH', widthCm: 60, heightCm: 90 });
  const grown = applyGrowthModuleToComposition(frame, buildCritterium8FrameComposition(frame));
  const result = resolveCritterium8FrameParts({ ...frame, heightCm: 128 }, { composition: grown.composition });
  const growth = result.parts.find((part) => part.type === 'GROWTH_MODULE');
  assert.equal(growth.code, '22191900163');
});

test('FLOOR_TO_CEILING agrega montante y U de techo', () => {
  const frame = createCritterium8FrameDefinition({ id: 'FTC', frameMode: 'FLOOR_TO_CEILING', widthCm: 60, heightCm: 280 });
  const composition = buildCritterium8FrameComposition(frame);
  const result = resolveCritterium8FrameParts(frame, { composition });
  assert.equal(result.parts.find((part) => part.type === 'CEILING_POST')?.code, '22000027842');
  assert.equal(result.parts.find((part) => part.type === 'CEILING_U')?.code, '22191200755');
  assert.equal(result.valid, true);
});

test('reporta códigos faltantes sin inventarlos y deja junction pendiente', () => {
  const frame = createCritterium8FrameDefinition({ id: 'DIAG', widthCm: 60, heightCm: 90 });
  const result = resolveCritterium8FrameParts(frame);
  assert.equal(result.parts.find((part) => part.type === 'FRAME_LEFT_POST').code, null);
  assert.equal(result.diagnostics.some((item) => item.code === 'MISSING_DOCUMENTED_CODE'), true);
  assert.deepEqual(resolveJunctionParts().parts, []);
});
