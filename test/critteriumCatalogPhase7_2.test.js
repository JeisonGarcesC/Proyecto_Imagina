import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCritteriumQuotation } from '../src/mepal/critterium8/commercial/critteriumQuotation.js';
import { parseCritteriumPriceCatalog } from '../src/mepal/critterium8/commercial/critteriumPriceCatalog.js';

const tag = (xml, name) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() || '';
const xml = (name) => readFileSync(new URL(`../public/data/xml/${name}`, import.meta.url), 'utf8');
const documentFromXml = (source) => ({
  querySelector: (name) => ({ textContent: tag(source, name) }),
  querySelectorAll: () => [...source.matchAll(/<Articulo>([\s\S]*?)<\/Articulo>/g)].map((match) => ({
    querySelector: (name) => ({ textContent: tag(match[1], name) }),
  })),
});

test('PT CRITTERIUM 8 activo no documenta puerta ni códigos de acabado comercial', () => {
  const records = [...xml('ptsinbom_4.xml').matchAll(/<Records>([\s\S]*?)<\/Records>/g)].map((match) => match[1]);
  const active = records.filter((record) => tag(record, 'LINEA_PRODUCTO') === 'CRITTERIUM 8' && tag(record, 'ACTIVO') !== 'FALSO');
  assert.equal(active.length, 354);
  assert.equal(active.filter((record) => /PUERTA|HOJA|BISAGRA|CERRADURA/i.test(record)).length, 0);
  assert.equal(active.filter((record) => /<ACABADO>|<COLOR>/i.test(record)).length, 0);
  assert.ok(active.some((record) => tag(record, 'MATERIAL') === 'LAMINA'));
});

test('U a techo queda sin precio solamente en EUC y cotización conserva total parcial', () => {
  const code = '22191200755';
  const prices = Object.fromEntries([['CO', 'PriceList_CO_2.xml'], ['EUC', 'Pricelist_EUC_2.xml'], ['USD', 'PriceList_USD_2.xml']]
    .map(([country, file]) => [country, parseCritteriumPriceCatalog(documentFromXml(xml(file)), file)]));
  assert.ok(prices.CO.entries.get(code)?.unitPrice > 0);
  assert.equal(prices.EUC.entries.get(code), undefined);
  assert.ok(prices.USD.entries.get(code)?.unitPrice > 0);
  const pricedCode = '22191900011';
  const bom = { rows: [{ code: pricedCode, qty: 1, sourceId: 'F1' }, { code, qty: 1, sourceId: 'F2' }], diagnostics: [] };
  const quote = buildCritteriumQuotation({ systemId: 'S1', bom, priceCatalog: prices.EUC });
  assert.equal(quote.items.find((item) => item.code === code).commercialStatus, 'CODE_WITHOUT_PRICE');
  assert.equal(quote.items.find((item) => item.code === pricedCode).commercialStatus, 'PRICED');
  assert.equal(quote.total, prices.EUC.entries.get(pricedCode).unitPrice);
  assert.equal(quote.isPartial, true);
  assert.ok(quote.diagnostics.some((item) => item.code === 'CRITERIUM_DOOR_NOT_DOCUMENTED'));
  assert.ok(quote.diagnostics.some((item) => item.code === 'CRITERIUM_FINISH_CATALOG_LIMITED'));
});

test('mismo código con dimensiones distintas permanece separado; acabado declarado sin catálogo queda sin validar', () => {
  const prices = { source: 'fixture', currency: 'COP', entries: new Map([['X', { unitPrice: 10, source: 'fixture' }]]) };
  const bom = { rows: [
    { code: 'X', description: 'Marco 90 × 60', qty: 1, finishCode: 'VISUAL_A', sourceId: 'F1' },
    { code: 'X', description: 'Marco 128 × 60', qty: 1, finishCode: 'VISUAL_A', sourceId: 'F2' },
  ], diagnostics: [] };
  const quote = buildCritteriumQuotation({ systemId: 'S1', bom, priceCatalog: prices });
  assert.equal(quote.items.length, 2);
  assert.deepEqual(quote.items.map((item) => item.description), bom.rows.map((row) => row.description));
  assert.ok(quote.items.every((item) => item.finishStatus === 'FINISH_UNCONFIRMED'));
  assert.equal(quote.diagnostics.filter((item) => item.code === 'FINISH_UNCONFIRMED').length, 2);
});

test('snapshot detecta a la vez precio y referencia cambiados sin escoger una variante ambigua', () => {
  const bom = { rows: [{ code: 'X', reference: 'R1', description: 'Marco 90', qty: 1 }], diagnostics: [] };
  const first = buildCritteriumQuotation({ systemId: 'S1', bom,
    priceCatalog: { source: 'original', currency: 'COP', entries: new Map([['X', { unitPrice: 10, source: 'original' }]]) } });
  const second = buildCritteriumQuotation({ systemId: 'S1', bom: { rows: [{ ...bom.rows[0], reference: 'R2' }], diagnostics: [] },
    priceCatalog: { source: 'actual', currency: 'COP', entries: new Map([['X', { unitPrice: 12, source: 'actual' }]]) },
    previousSnapshot: first.snapshot });
  assert.ok(second.diagnostics.some((item) => item.code === 'COMMERCIAL_METADATA_CHANGED' && item.dimension === 'reference'));
  assert.ok(second.diagnostics.some((item) => item.code === 'COMMERCIAL_CATALOG_CHANGED' && item.previousUnitPrice === 10 && item.currentUnitPrice === 12));
});
