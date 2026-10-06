import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CRITTERIUM8_FRAME_CATALOG, CRITTERIUM8_UPRIGHT_CATALOG, CRITTERIUM8_GROWTH_MODULE_CATALOG, CRITTERIUM8_CEILING_U_CODE } from '../src/mepal/critterium8/catalog/frameCatalog.js';
import { CRITTERIUM8_FORMICA_CODE_CATALOG, CRITTERIUM8_TILE_CATALOG } from '../src/mepal/critterium8/catalog/tileCatalog.js';
import { CRITTERIUM8_JUNCTION_PART_CATALOG } from '../src/mepal/critterium8/junctions/junctionPartCatalog.js';
import { parseCritteriumPriceCatalog } from '../src/mepal/critterium8/commercial/critteriumPriceCatalog.js';
import { buildCritteriumQuotation, exportCritteriumQuotationJson } from '../src/mepal/critterium8/commercial/critteriumQuotation.js';

const files = { CO: 'PriceList_CO_2.xml', EUC: 'Pricelist_EUC_2.xml', USD: 'PriceList_USD_2.xml' };
const source = (country) => readFileSync(new URL(`../public/data/xml/${files[country]}`, import.meta.url), 'utf8');
const tag = (xml, name) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() || null;
const documentFromXml = (xml) => ({
  querySelector: (name) => name === 'Moneda' ? { textContent: tag(xml, name) } : null,
  querySelectorAll: (name) => name === 'Articulo' ? [...xml.matchAll(/<Articulo>([\s\S]*?)<\/Articulo>/g)].map((match) => ({
    querySelector: (field) => ({ textContent: tag(match[1], field) }),
  })) : [],
});
const catalog = (country, xml = source(country)) => parseCritteriumPriceCatalog(documentFromXml(xml), files[country]);
const codes = [...new Set([
  ...CRITTERIUM8_FRAME_CATALOG.map((item) => item.code),
  ...CRITTERIUM8_UPRIGHT_CATALOG.map((item) => item.code),
  ...CRITTERIUM8_GROWTH_MODULE_CATALOG.map((item) => item.code),
  ...CRITTERIUM8_FORMICA_CODE_CATALOG.map((item) => item.code),
  CRITTERIUM8_CEILING_U_CODE,
  ...Object.values(CRITTERIUM8_JUNCTION_PART_CATALOG).flatMap((item) =>
    [...Object.values(item.halfHeight), ...Object.values(item.floorToCeiling)]),
])];

test('matriz de cobertura clasifica todos los códigos CRITERIUM documentados frente a los tres XML reales', () => {
  assert.ok(codes.length > 50);
  for (const country of Object.keys(files)) {
    const prices = catalog(country);
    const matrix = codes.map((code) => ({ code, price: prices.entries.get(code) }));
    assert.equal(matrix.length, codes.length);
    assert.ok(prices.currency);
    assert.ok(matrix.every(({ price }) => !price || price.ambiguous || price.unitPrice == null || Number.isFinite(price.unitPrice)));
    const counts = { priced: matrix.filter(({ price }) => price?.unitPrice > 0 && !price.ambiguous).length,
      missing: matrix.filter(({ price }) => !price || price.unitPrice == null || price.unitPrice <= 0).length,
      ambiguous: matrix.filter(({ price }) => price?.ambiguous).length };
    console.log(`CRITERIUM ${country} ${prices.currency}: ${JSON.stringify(counts)} / ${codes.length} códigos; faltantes: ${matrix.filter(({ price }) => !price || price.unitPrice == null || price.unitPrice <= 0).map(({ code }) => code).join(',') || 'ninguno'}`);
  }
  assert.equal(Object.keys(CRITTERIUM8_TILE_CATALOG).includes('DOOR'), false);
});

test('cambio de precio en copia del XML real se detecta sin modificar el archivo', () => {
  const originalXml = source('CO');
  const originalCatalog = catalog('CO', originalXml);
  const code = codes.find((candidate) => originalCatalog.entries.get(candidate)?.unitPrice > 0);
  const article = [...originalXml.matchAll(/<Articulo>([\s\S]*?)<\/Articulo>/g)].find((match) => tag(match[1], 'Codigo') === code);
  assert.ok(article);
  const oldPrice = Number(tag(article[1], 'Precio'));
  const changedXml = originalXml.replace(article[0], article[0].replace(/<Precio>[^<]*<\/Precio>/, `<Precio>${oldPrice + 1}</Precio>`));
  const bom = { rows: [{ code, qty: 2, sourceId: 'FRAME-1' }], diagnostics: [] };
  const first = buildCritteriumQuotation({ systemId: 'S1', bom, priceCatalog: originalCatalog });
  const second = buildCritteriumQuotation({ systemId: 'S1', bom, priceCatalog: catalog('CO', changedXml), previousSnapshot: first.snapshot });
  assert.equal(first.items[0].unitPrice, oldPrice);
  assert.equal(second.items[0].unitPrice, oldPrice + 1);
  assert.equal(second.total - first.total, 2);
  assert.ok(second.diagnostics.some((item) => item.code === 'COMMERCIAL_CATALOG_CHANGED' && item.previousUnitPrice === oldPrice));
  assert.equal(source('CO'), originalXml);
});

test('BOM y cotización conservan trazabilidad; cambios de código y metadatos quedan diagnosticados', () => {
  const prices = catalog('CO');
  const [code, other] = codes.filter((candidate) => prices.entries.get(candidate)?.unitPrice > 0).slice(0, 2);
  assert.ok(code && other);
  const row = { code, reference: 'R1', description: 'Componente documentado', qty: 1, sourceId: 'F1', materialCode: 'M1', finishCode: 'A1' };
  const first = buildCritteriumQuotation({ systemId: 'S1', bom: { rows: [row], diagnostics: [] }, priceCatalog: prices });
  assert.deepEqual(first.items[0].sourceIds, ['F1']);
  assert.equal(first.items[0].description, row.description);
  assert.equal(first.items[0].quantity, row.qty);
  assert.equal(first.items[0].subtotal, first.items[0].unitPrice);
  const changed = buildCritteriumQuotation({ systemId: 'S1', bom: { rows: [{ ...row, code: other, reference: 'R2', materialCode: 'M2', finishCode: 'A2' }], diagnostics: [] },
    priceCatalog: prices, previousSnapshot: first.snapshot });
  assert.ok(changed.diagnostics.some((item) => item.code === 'COMMERCIAL_CODE_CHANGED'));
  assert.deepEqual(changed.diagnostics.filter((item) => item.code === 'COMMERCIAL_METADATA_CHANGED').map((item) => item.dimension).sort(),
    ['description', 'finishCommercial', 'materialCommercial', 'reference']);
  const exported = JSON.parse(exportCritteriumQuotationJson(changed));
  assert.equal(exported.systemId, 'S1');
  assert.equal(exported.currency, prices.currency);
  assert.equal(exported.items[0].sourceIds[0], 'F1');
  assert.equal(JSON.stringify(exported).includes('Object3D'), false);
});
