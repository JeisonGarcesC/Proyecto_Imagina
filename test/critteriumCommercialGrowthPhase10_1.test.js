import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Scene } from 'three';
import { CRITTERIUM8_GROWTH_MODULE_CATALOG } from '../src/mepal/critterium8/catalog/frameCatalog.js';
import { getCritterium8GrowthOptions } from '../src/mepal/critterium8/rules/frameCompositionRules.js';
import { patchCritterium8TileConfig, resolveCritterium8ConfigPatch } from '../src/mepal/critterium8/integration/critterium8Config.js';
import { validateCritteriumSequenceDraft } from '../src/mepal/critterium8/integration/critterium8Configurator.js';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { rebuildCritterium8Instance } from '../src/mepal/critterium8/integration/rebuildCritterium8Instance.js';
import { registerCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { registerCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import { serializeCritterium8Sequence, restoreCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequencePersistence.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';
import { buildCritteriumQuotation } from '../src/mepal/critterium8/commercial/critteriumQuotation.js';
import { parseCritteriumPriceCatalog } from '../src/mepal/critterium8/commercial/critteriumPriceCatalog.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { resolveCritteriumConnectionPoints } from '../src/mepal/critterium8/system/layout/CritteriumConnectionResolver.js';
import { getCritterium8AssemblyRoot } from '../src/mepal/critterium8/utils/critterium8Selection.js';

const tag = (xml, name) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() || '';
const xml = (name) => readFileSync(new URL(`../public/data/xml/${name}`, import.meta.url), 'utf8');
const priceDocument = (source) => ({
  querySelector: (name) => ({ textContent: tag(source, name) }),
  querySelectorAll: () => [...source.matchAll(/<Articulo>([\s\S]*?)<\/Articulo>/g)].map((match) => ({
    querySelector: (name) => ({ textContent: tag(match[1], name) }),
  })),
});
const registry = (assembly) => [{ obj: assembly }];
const growth = [{ index: 0 }];

test('cuatro códigos de crecimiento 38 cm tienen PT activo y precio real por lista', () => {
  const records = [...xml('ptsinbom_4.xml').matchAll(/<Records>([\s\S]*?)<\/Records>/g)].map((match) => match[1]);
  for (const entry of CRITTERIUM8_GROWTH_MODULE_CATALOG) {
    const record = records.find((item) => tag(item, 'CODIGO_PT') === entry.code && tag(item, 'LINEA_PRODUCTO') === 'CRITTERIUM 8');
    assert.ok(record, entry.code);
    assert.notEqual(tag(record, 'ACTIVO'), 'FALSO');
    assert.match(tag(record, 'DESCRIPCION_LARGA'), /MODULO CRECIMIENTO 38/);
    assert.equal(entry.heightCm, 38);
  }
  for (const file of ['PriceList_CO_2.xml', 'Pricelist_EUC_2.xml', 'PriceList_USD_2.xml']) {
    const prices = parseCritteriumPriceCatalog(priceDocument(xml(file)), file);
    assert.ok(prices.currency);
    for (const entry of CRITTERIUM8_GROWTH_MODULE_CATALOG)
      assert.ok(prices.entries.get(entry.code)?.unitPrice > 0, `${entry.code} sin precio en ${file}`);
  }
});

test('configurador acepta crecimiento documentado y rechaza alto, ancho, modo y composición incompatibles', () => {
  const base = { widthCm: 60, heightCm: 90, frameMode: 'HALF_HEIGHT', compositionMode: 'MODULAR', growthModules: [] };
  assert.deepEqual(getCritterium8GrowthOptions(base), [0, 1, 2, 3]);
  const valid = resolveCritterium8ConfigPatch({ config: base, patch: { growthModules: growth }, frameId: 'G1' });
  assert.equal(valid.success, true);
  assert.equal(valid.config.heightCm, 90);
  assert.equal(valid.config.projectHeightCm, 128);
  assert.equal(valid.composition.baseFrameHeightCm, 90);
  assert.equal(valid.composition.heightCm, 128);
  assert.equal(valid.composition.growthModules[0].code, '22191900163');
  const upperSlot = valid.composition.tileSlots.at(-1);
  const tiled = patchCritterium8TileConfig({ config: valid.config, frameId: 'G1', slotId: upperSlot.id, patch: { tileType: 'FORMICA' } });
  assert.equal(tiled.success, true);
  assert.equal(tiled.config.tiles[0].slotId, upperSlot.id);
  assert.equal(tiled.config.tiles[0].heightCm, 38);
  assert.equal(resolveCritterium8ConfigPatch({ config: { ...base, heightCm: 110 }, patch: { growthModules: growth }, frameId: 'G2' }).reason, 'GROWTH_BASE_HEIGHT_NOT_DOCUMENTED');
  assert.equal(resolveCritterium8ConfigPatch({ config: { ...base, widthCm: 30 }, patch: { growthModules: growth }, frameId: 'G3' }).reason, 'GROWTH_WIDTH_NOT_DOCUMENTED');
  assert.equal(resolveCritterium8ConfigPatch({ config: { ...base, heightCm: 166 }, patch: { growthModules: [growth[0], { index: 1 }] }, frameId: 'G4' }).reason, 'GROWTH_EXCEEDS_204');
  assert.equal(resolveCritterium8ConfigPatch({ config: { ...base, compositionMode: 'FULL_TILE' }, patch: { growthModules: growth }, frameId: 'G5' }).reason, 'GROWTH_REQUIRES_MODULAR_COMPOSITION');
  assert.equal(resolveCritterium8ConfigPatch({ config: { ...base, frameMode: 'FLOOR_TO_CEILING', heightCm: 204, projectHeightCm: 242 }, patch: { growthModules: growth }, frameId: 'G6' }).reason, 'GROWTH_REQUIRES_HALF_HEIGHT_FRAME');
});

test('pieza adicional cambia geometría, BOM y cotización sin cambiar código del marco base', async () => {
  const base = await createCritterium8Instance({ instanceId: 'I1', frameId: 'F1', widthCm: 60, heightCm: 90 });
  const extended = await rebuildCritterium8Instance({ assembly: base.assembly, patch: { growthModules: growth } });
  assert.equal(extended.success, true);
  const grown = extended.instance.assembly;
  assert.equal(grown.userData.instanceId, 'I1');
  assert.equal(grown.userData.frameId, 'F1');
  assert.equal(grown.userData.definition.heightCm, 90);
  assert.equal(grown.userData.composition.heightCm, 128);
  assert.equal(grown.userData.layout.bounds.maxY, 128);
  assert.equal(grown.userData.bounds2d.sizeLocal[1], 1.28);
  assert.equal(grown.userData.layout.placements.find((part) => part.partType === 'GROWTH_MODULE').position.y, 109);
  const baseBom = resolveCritterium8BOM(registry(base.assembly));
  const grownBom = resolveCritterium8BOM(registry(grown));
  assert.deepEqual(grownBom.rows.filter((row) => row.code !== '22191900163'), baseBom.rows);
  assert.equal(grownBom.rows.find((row) => row.code === '22191900163')?.qty, 1);
  const prices = parseCritteriumPriceCatalog(priceDocument(xml('PriceList_CO_2.xml')), 'CO');
  const baseQuote = buildCritteriumQuotation({ systemId: 'S1', bom: baseBom, priceCatalog: prices });
  const grownQuote = buildCritteriumQuotation({ systemId: 'S1', bom: grownBom, priceCatalog: prices });
  const item = grownQuote.items.find((row) => row.code === '22191900163');
  assert.equal(item.commercialStatus, 'PRICED');
  assert.equal(item.quantity, 1);
  assert.equal(item.subtotal, item.unitPrice);
  assert.equal(grownQuote.currency, 'COP');
  assert.equal(grownQuote.total - baseQuote.total, item.unitPrice);
});

test('guardar/reabrir, rehacer/deshacer configuración y duplicar conservan contrato e identidad', async () => {
  const base = await createCritterium8Instance({ instanceId: 'I1', frameId: 'F1', widthCm: 60, heightCm: 90, transform: { position: [2, 0, -1] } });
  const on = await rebuildCritterium8Instance({ assembly: base.assembly, patch: { growthModules: growth } });
  assert.equal(on.success, true);
  const undo = await rebuildCritterium8Instance({ assembly: on.instance.assembly, patch: base.assembly.userData.config });
  assert.equal(undo.success, true);
  assert.equal(undo.instance.composition.heightCm, 90);
  assert.equal(resolveCritterium8BOM(registry(undo.instance.assembly)).rows.some((row) => row.code === '22191900163'), false);
  const redo = await rebuildCritterium8Instance({ assembly: undo.instance.assembly, patch: on.instance.assembly.userData.config });
  assert.equal(redo.success, true);
  assert.equal(redo.instance.composition.heightCm, 128);
  const saved = serializeProjectEntities(registry(redo.instance.assembly)).entities[0];
  assert.equal(saved.config.growthModules.length, 1);
  assert.equal(saved.config.heightCm, 90);
  const restored = await createCritterium8Instance({ ...saved.config, instanceId: saved.instanceId, frameId: saved.frameId, transform: saved.transform });
  assert.deepEqual(restored.assembly.position.toArray(), [2, 0, -1]);
  assert.deepEqual(resolveCritterium8BOM(registry(restored.assembly)).rows, resolveCritterium8BOM(registry(redo.instance.assembly)).rows);
  const duplicate = await createCritterium8Instance({ ...saved.config, instanceId: 'I2', frameId: 'F2' });
  assert.notEqual(duplicate.assembly.userData.instanceId, saved.instanceId);
  assert.notEqual(duplicate.assembly.userData.frameId, saved.frameId);
  assert.equal(duplicate.composition.heightCm, 128);
  assert.deepEqual(duplicate.parts.filter((part) => part.type === 'GROWTH_MODULE').map((part) => part.code), ['22191900163']);
});

test('secuencia y Smart Snap usan altura física final; transición no documentada se rechaza', async () => {
  const draft = { frames: [
    { widthCm: 60, heightCm: 90, frameMode: 'HALF_HEIGHT', compositionMode: 'MODULAR', growthModules: growth },
    { widthCm: 60, heightCm: 90, frameMode: 'HALF_HEIGHT', compositionMode: 'MODULAR', growthModules: growth },
  ], orientationDeg: 0 };
  assert.equal(validateCritteriumSequenceDraft(draft).success, true);
  const invalid = validateCritteriumSequenceDraft({ ...draft, frames: [draft.frames[0], { ...draft.frames[1], growthModules: [] }] });
  assert.equal(invalid.success, false);
  assert.equal(invalid.reason, 'HEIGHT_TRANSITION_REQUIRED');
  const scene = new Scene(); const frames = [];
  for (let index = 0; index < 2; index += 1) {
    const item = await createCritterium8Instance({ ...draft.frames[index], instanceId: `I${index}`, frameId: `F${index}` });
    item.assembly.position.x = 0.3 + index * 0.6;
    scene.add(item.assembly);
    frames.push(item.assembly);
  }
  const sequence = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(sequence.success, true);
  assert.deepEqual(sequence.sequence.slots.map((slot) => slot.heightCm), [128, 128]);
  assert.ok(sequence.sequence.junctions.every((junction) => junction.metadata.heightsCm.every((height) => height === 128)));
  const points = resolveCritteriumConnectionPoints(sequence.sequenceRoot);
  assert.equal(points.length, 2);
  assert.ok(points.every((point) => point.heightCm === 128 && point.projectHeightCm === 128));
  const growthPart = frames[0].children.find((child) => child.userData?.partType === 'GROWTH_MODULE');
  assert.equal(getCritterium8AssemblyRoot(growthPart), frames[0]);
  assert.equal(sequence.sequence.slots[0].frameId, frames[0].userData.frameId);
  assert.ok(sequence.sequence.slots[0].moduleId);
});

test('persistencia y duplicación de secuencia conservan slots y BOM con IDs nuevos', async () => {
  const scene = new Scene(); const parts = []; const pickables = [];
  const originals = [];
  for (let index = 0; index < 2; index += 1) {
    const instance = await createCritterium8Instance({ widthCm: 60, heightCm: 90, growthModules: growth,
      instanceId: `GROWN_I${index}`, frameId: `GROWN_F${index}` });
    instance.assembly.position.x = 0.3 + index * 0.6;
    registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
    originals.push(instance.assembly);
  }
  const prepared = prepareCritterium8Sequence({ frameAssemblies: originals });
  assert.equal(prepared.success, true);
  registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
  const savedFrames = serializeProjectEntities(parts).entities.filter((item) => item.kind === 'CRITTERIUM_8');
  const savedSequence = serializeCritterium8Sequence(prepared.sequenceRoot);
  assert.deepEqual(savedSequence.sequence.slots.map((slot) => slot.heightCm), [128, 128]);
  const beforeCodes = resolveCritterium8BOM(parts).rows.map((row) => [row.code, row.qty]).sort();
  const reopenedScene = new Scene(); const reopenedParts = []; const reopenedPickables = [];
  const reopened = [];
  for (const saved of savedFrames) {
    const instance = await createCritterium8Instance({ ...saved.config, instanceId: saved.instanceId,
      frameId: saved.frameId, transform: saved.transform });
    registerCritterium8Instance({ instance, parent: reopenedScene, partsRegistry: reopenedParts, pickables: reopenedPickables });
    reopened.push(instance.assembly);
  }
  const restored = restoreCritterium8Sequence(savedSequence, { scene: reopenedScene, partsRegistry: reopenedParts,
    pickables: reopenedPickables, findFrame: (id) => reopened.find((frame) => frame.userData.frameId === id) });
  assert.deepEqual(restored.userData.sequence.slots.map((slot) => slot.moduleId), savedSequence.sequence.slots.map((slot) => slot.moduleId));
  assert.deepEqual(resolveCritterium8BOM(reopenedParts).rows.map((row) => [row.code, row.qty]).sort(), beforeCodes);
  const duplicated = [];
  for (const [index, saved] of savedFrames.entries()) {
    const instance = await createCritterium8Instance({ ...saved.config, instanceId: `COPY_I${index}`, frameId: `COPY_F${index}` });
    instance.assembly.position.x = 2.3 + index * 0.6;
    duplicated.push(instance.assembly);
  }
  const copy = prepareCritterium8Sequence({ frameAssemblies: duplicated });
  assert.equal(copy.success, true);
  assert.notEqual(copy.sequence.id, savedSequence.sequenceId);
  assert.ok(copy.sequence.slots.every((slot) => !savedSequence.sequence.slots.some((old) => old.moduleId === slot.moduleId || old.frameId === slot.frameId)));
  const copyCodes = resolveCritterium8BOM([...duplicated, copy.sequenceRoot].map((obj) => ({ obj }))).rows.map((row) => [row.code, row.qty]).sort();
  assert.deepEqual(copyCodes, beforeCodes);
  assert.equal(copyCodes.filter(([code]) => code === '22191900163').length, 2);
  const prices = parseCritteriumPriceCatalog(priceDocument(xml('PriceList_CO_2.xml')), 'CO');
  const originalQuote = buildCritteriumQuotation({ systemId: 'ORIGINAL', bom: resolveCritterium8BOM(parts), priceCatalog: prices });
  const duplicateQuote = buildCritteriumQuotation({ systemId: 'DUPLICATE', bom: resolveCritterium8BOM([...duplicated, copy.sequenceRoot].map((obj) => ({ obj }))), priceCatalog: prices });
  assert.equal(duplicateQuote.currency, originalQuote.currency);
  assert.equal(duplicateQuote.total, originalQuote.total);
  assert.deepEqual(duplicateQuote.items.map((item) => [item.code, item.quantity, item.unitPrice]).sort(),
    originalQuote.items.map((item) => [item.code, item.quantity, item.unitPrice]).sort());
});
