import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCritteriumQuotation, exportCritteriumQuotationJson } from '../src/mepal/critterium8/commercial/critteriumQuotation.js';
import { parseCritteriumPriceCatalog } from '../src/mepal/critterium8/commercial/critteriumPriceCatalog.js';
import { Scene } from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { registerCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { registerCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import { createCritteriumSystemFromSequences } from '../src/mepal/critterium8/system/critteriumSystem.js';
import { serializeCritteriumSystem, restoreCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystemPersistence.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';

const makeDoc = (currency, articles) => ({
  querySelector: (tag) => tag === 'Moneda' && currency ? { textContent: currency } : null,
  querySelectorAll: (tag) => tag === 'Articulo' ? articles.map(([code, price]) => ({
    querySelector: (field) => ({ Codigo: { textContent: code }, Precio: { textContent: price } })[field] || null,
  })) : [],
});
const bom = { rows: [
  { code: 'FRAME', description: 'Marco', qty: 1, sourceId: 'F1', materialCode: 'METAL', finishCode: 'WHITE' },
  { code: 'FRAME', description: 'Marco', qty: 2, sourceId: 'F2', materialCode: 'METAL', finishCode: 'WHITE' },
  { code: 'FRAME', description: 'Marco', qty: 1, sourceId: 'F3', materialCode: 'METAL', finishCode: 'BLACK' },
  { code: 'TILE', reference: 'REF-1', description: 'Baldosa', qty: 2, sourceId: 'T1' },
], diagnostics: [{ code: 'MISSING_DOCUMENTED_CODE', frameId: 'F4', partType: 'TILE' }] };

test('catálogo conserva moneda explícita y detecta precios ambiguos', () => {
  const catalog = parseCritteriumPriceCatalog(makeDoc('COP', [['FRAME', '100'], ['FRAME', '200'], ['TILE', '50']]), 'lista.xml');
  assert.equal(catalog.currency, 'COP');
  assert.equal(catalog.entries.get('FRAME').ambiguous, true);
  assert.equal(catalog.entries.get('TILE').unitPrice, 50);
});

test('cotización agrupa por código, referencia, material y acabado sin inventar IVA', () => {
  const prices = parseCritteriumPriceCatalog(makeDoc('COP', [['FRAME', '100'], ['TILE', '50']]), 'lista.xml');
  const quote = buildCritteriumQuotation({ systemId: 'S1', bom, priceCatalog: prices,
    catalogByCode: new Map([['TILE', { raw: { material: 'FORMICA' } }]]),
    office: { sequenceCount: 2, moduleCount: 4, connectionCount: 1, lengthM: 3.6 } });
  assert.equal(quote.items.length, 4);
  assert.equal(quote.items.find((item) => item.code === 'FRAME' && item.finishCommercial === 'WHITE').quantity, 3);
  assert.equal(quote.items.find((item) => item.code === 'TILE').materialCommercial, 'FORMICA');
  assert.equal(quote.items.find((item) => item.code === null).commercialStatus, 'NO_COMMERCIAL_CODE');
  assert.equal(quote.subtotal, 500);
  assert.equal(quote.total, 500);
  assert.equal(quote.tax, null);
  assert.equal(quote.currency, 'COP');
  assert.equal(quote.status, 'CONFIGURATION_INCOMPLETE');
  assert.deepEqual(JSON.parse(exportCritteriumQuotationJson(quote)).items, quote.items);
});

test('sin precio o moneda se muestra estado incompleto y subtotal parcial', () => {
  const quote = buildCritteriumQuotation({ systemId: 'S1', bom: { rows: [{ code: 'UNKNOWN', qty: 1, description: 'Sin precio' }], diagnostics: [] },
    priceCatalog: { source: 'sin-moneda.xml', currency: null, entries: new Map() } });
  assert.equal(quote.items[0].commercialStatus, 'CODE_WITHOUT_PRICE');
  assert.equal(quote.items[0].unitPrice, null);
  assert.equal(quote.total, 0);
  assert.equal(quote.isPartial, true);
  assert.ok(quote.diagnostics.some((item) => item.code === 'CURRENCY_UNCONFIRMED'));
});

test('cotización completa y cambio posterior de precio o código producen diagnósticos', () => {
  const initial = buildCritteriumQuotation({ systemId: 'S1', bom: { rows: [{ code: 'FRAME', qty: 1 }], diagnostics: [] },
    priceCatalog: parseCritteriumPriceCatalog(makeDoc('COP', [['FRAME', '100']]), 'lista.xml') });
  assert.equal(initial.status, 'CONFIGURATION_COMPLETE');
  const changedPrice = buildCritteriumQuotation({ systemId: 'S1', bom: { rows: [{ code: 'FRAME', qty: 1 }], diagnostics: [] },
    priceCatalog: parseCritteriumPriceCatalog(makeDoc('COP', [['FRAME', '120']]), 'lista.xml'), previousSnapshot: initial.snapshot });
  assert.ok(changedPrice.diagnostics.some((item) => item.code === 'COMMERCIAL_CATALOG_CHANGED'));
  const changedCode = buildCritteriumQuotation({ systemId: 'S1', bom: { rows: [{ code: 'OTHER', qty: 1 }], diagnostics: [] },
    priceCatalog: parseCritteriumPriceCatalog(makeDoc('COP', [['OTHER', '100']]), 'lista.xml'), previousSnapshot: initial.snapshot });
  assert.ok(changedCode.diagnostics.some((item) => item.code === 'COMMERCIAL_CODE_CHANGED'));
});

test('BOM físico de una secuencia alimenta cotización y snapshot persiste sin alterar componentes', async () => {
  const scene = new Scene(); const parts = []; const pickables = []; const frames = [];
  for (let index = 0; index < 2; index += 1) {
    const instance = await createCritterium8Instance({ widthCm: 90, heightCm: 90,
      instanceId: `QUOTE_I${index}`, frameId: `QUOTE_F${index}` });
    instance.assembly.position.x = 0.45 + index * 0.9;
    registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
    frames.push(instance.assembly);
  }
  const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(prepared.success, true);
  registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
  const system = createCritteriumSystemFromSequences([prepared.sequenceRoot]);
  const before = resolveCritterium8BOM(parts);
  const prices = { source: 'fixture.xml', currency: 'COP', entries: new Map(before.rows.map((row) =>
    [row.code, { code: row.code, unitPrice: 100, source: 'fixture.xml' }])) };
  const quote = buildCritteriumQuotation({ systemId: system.userData.systemId, bom: before, priceCatalog: prices });
  assert.equal(quote.items.reduce((sum, item) => sum + item.quantity, 0), before.rows.reduce((sum, row) => sum + row.qty, 0));
  assert.deepEqual(new Set(quote.items.map((item) => item.code)), new Set(before.rows.map((row) => row.code)));
  system.userData.commercialSnapshot = quote.snapshot;
  const saved = serializeCritteriumSystem(system);
  assert.deepEqual(saved.commercialSnapshot, quote.snapshot);
  scene.remove(system);
  for (const sequence of system.children.slice()) scene.attach(sequence);
  delete prepared.sequenceRoot.userData.parentSystemId;
  const restored = restoreCritteriumSystem(saved, { scene, partsRegistry: [],
    findSequence: (id) => id === prepared.sequenceRoot.userData.sequenceId ? prepared.sequenceRoot : null });
  assert.deepEqual(restored.userData.commercialSnapshot, quote.snapshot);
  assert.deepEqual(resolveCritterium8BOM(parts).rows, before.rows);
});
