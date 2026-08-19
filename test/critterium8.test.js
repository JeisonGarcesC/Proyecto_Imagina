import test from 'node:test';
import assert from 'node:assert/strict';

import { createCritterium8FrameDefinition, validateCritterium8FrameDefinition } from '../src/mepal/critterium8/definitions/frameDefinition.js';
import { createCritterium8FrameSequenceDefinition } from '../src/mepal/critterium8/definitions/frameSequenceDefinition.js';
import { getCritterium8FrameCatalogEntry, getCritterium8GrowthModule } from '../src/mepal/critterium8/catalog/frameCatalog.js';
import { CRITTERIUM8_JUNCTION_TYPES, canCritterium8DuctReplaceJunction } from '../src/mepal/critterium8/catalog/junctionCatalog.js';
import { isTileCombinationAllowed } from '../src/mepal/critterium8/rules/tileRules.js';
import { resolveCritterium8FloorToCeilingComposition, validateCritterium8GrowthModule } from '../src/mepal/critterium8/rules/frameRules.js';

test('frame 90x30 y frame 204x120 son válidos', () => {
  assert.equal(validateCritterium8FrameDefinition(createCritterium8FrameDefinition({ widthCm: 30, heightCm: 90 })).valid, true);
  assert.equal(validateCritterium8FrameDefinition(createCritterium8FrameDefinition({ widthCm: 120, heightCm: 204 })).valid, true);
});

test('rechaza una altura no documentada', () => {
  assert.equal(validateCritterium8FrameDefinition(createCritterium8FrameDefinition({ widthCm: 60, heightCm: 100 })).valid, false);
});

test('resuelve códigos documentados de marco', () => {
  assert.equal(getCritterium8FrameCatalogEntry({ heightCm: 90, widthCm: 30 })?.code, '22191900000');
  assert.equal(getCritterium8FrameCatalogEntry({ heightCm: 128, widthCm: 90 })?.code, '22191900011');
});

test('valida módulos de crecimiento sin inferir anchos', () => {
  assert.equal(validateCritterium8GrowthModule({ widthCm: 60 }).valid, true);
  assert.equal(getCritterium8GrowthModule(60)?.code, '22191900163');
  assert.equal(validateCritterium8GrowthModule({ widthCm: 105 }).valid, false);
});

test('modela floor-to-ceiling de 242 cm como composición documental', () => {
  const frame = createCritterium8FrameDefinition({ frameMode: 'FLOOR_TO_CEILING', widthCm: 60, heightCm: 242 });
  assert.equal(validateCritterium8FrameDefinition(frame).valid, true);
  assert.deepEqual(resolveCritterium8FloorToCeilingComposition({ projectHeightCm: 242, widthCm: 60 })?.components.map((item) => item.type), ['PANEL_FRAME', 'UPRIGHT_FRAME', 'CEILING_U']);
});

test('valida combinaciones documentadas de baldosas', () => {
  assert.equal(isTileCombinationAllowed({ type: 'FORMICA', widthCm: 60, heightCm: 38 }), true);
  assert.equal(isTileCombinationAllowed({ type: 'FORMICA', widthCm: 105, heightCm: 38 }), false);
  assert.equal(isTileCombinationAllowed({ type: 'GLASS', widthCm: 150, heightCm: 38 }), true);
  assert.equal(isTileCombinationAllowed({ type: 'GLASS', widthCm: 150, heightCm: 76 }), false);
});

test('expone junctions y regla de reemplazo por ducto', () => {
  assert.deepEqual(CRITTERIUM8_JUNCTION_TYPES, ['TERMINAL', 'DEG_90', 'DEG_180', 'DEG_180_TYPE_B', 'DEG_45_135', 'DEG_120', 'T', 'X']);
  assert.equal(canCritterium8DuctReplaceJunction({ ductType: 'T', heightCm: 90 }), true);
  assert.equal(canCritterium8DuctReplaceJunction({ ductType: 'UPRIGHT', heightCm: 204 }), true);
  assert.equal(canCritterium8DuctReplaceJunction({ ductType: 'UPRIGHT', heightCm: 166 }), false);
});

test('crea una secuencia declarativa sin conectividad automática', () => {
  const sequence = createCritterium8FrameSequenceDefinition({ frameIds: ['A', 'B'], junctions: [{ type: 'DEG_90' }] });
  assert.equal(sequence.type, 'FRAME_SEQUENCE');
  assert.deepEqual(sequence.frameIds, ['A', 'B']);
});
