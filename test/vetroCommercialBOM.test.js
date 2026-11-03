import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { completeVetroCatalog } from '../src/catalog/buildCatalogFromXml.js';
import { createVetroSystem } from '../src/mepal/vetro/factories/createVetroSystem.js';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { getVetroSystemBOM } from '../src/mepal/vetro/bom/vetroSystemBOM.js';

function xmlArticle(code) {
  const xml = fs.readFileSync(new URL('../public/data/xml/PriceList_CO_2.xml', import.meta.url), 'utf8');
  const start = xml.indexOf(`<Codigo>${code}</Codigo>`);
  if (start < 0) return null;
  const article = xml.slice(start, xml.indexOf('</Articulo>', start));
  return {
    description: article.match(/<Descripcion>([^<]+)<\/Descripcion>/)?.[1] || null,
    price: Number(article.match(/<Precio>([^<]+)<\/Precio>/)?.[1] || 0),
  };
}

const codes = ['22000009783', '22000009787', '22000009791', '22000009792', '22000009793', '22000017629', '22000017630', '22000011980'];
const coItems = new Map(codes.map((code) => [code, xmlArticle(code)]).filter(([, value]) => value));
const prices = { CO: new Map([...coItems].map(([code, item]) => [code, item.price])), EUC: new Map(), USD: new Map() };
const catalog = new Map(completeVetroCatalog([], prices, new Map([...coItems].map(([code, item]) => [code, item.description]))).map((item) => [item.codigoPT, item]));

test('commercial Vetro catalog completes missing PT entries from existing Vetro map and price XML', () => {
  assert.equal(catalog.get('22000009791')?.ui.title, 'KIT UNION A 180 GRADOS VIDRIO DE 10MM VETRO VTAC030000');
  assert.equal(catalog.get('22000009791')?.prices.CO, 196350);
  assert.equal(catalog.get('22000009792')?.prices.CO, coItems.get('22000009792').price);
  assert.equal(catalog.get('99999999999'), undefined);
  assert.equal(catalog.get('22000009791')?.prices.USD, 0);
  assert.equal(Number(catalog.get('22000009791')?.prices.USD) > 0, false);
});

test('individual Vetro product and system component resolve the same SKU, description and price', async () => {
  const product = await createVetroInstance({ config: { category: 'PANELS', productType: 'PANEL', material: 'TEMPERED_GLASS_10MM', nominalWidthCm: 90, nominalHeightCm: 204 } });
  const system = await createVetroSystem({ requestedWidthMm: 1800, heightMm: 2040, panelWidthsMm: [900, 900] });
  assert.equal(product.success, true, product.reason);
  assert.equal(system.success, true, system.reason);
  const code = product.object.userData.code;
  const row = getVetroSystemBOM(system.object).find((item) => item.code === code);
  assert.equal(row.quantity, 2);
  assert.equal(catalog.get(code).ui.title, coItems.get(code).description);
  assert.equal(catalog.get(code).prices.CO, coItems.get(code).price);
  assert.equal(catalog.get(code).prices.CO * row.quantity, coItems.get(code).price * 2);
});

for (const [shape, config] of [
  ['LINE', { requestedWidthMm: 1800, panelWidthsMm: [900, 900] }],
  ['L', { requestedWidthMm: 900, panelWidthsMm: [900], returnWidthMm: 900, returnPanelWidthsMm: [900] }],
  ['T', { requestedWidthMm: 1800, panelWidthsMm: [900, 900], returnWidthMm: 900, returnPanelWidthsMm: [900] }],
]) {
  test(`${shape} system BOM resolves all known SKUs through the same catalog`, async () => {
    const result = await createVetroSystem({ shape, heightMm: 2040, ...config });
    assert.equal(result.success, true, result.reason);
    for (const row of getVetroSystemBOM(result.object)) {
      const item = catalog.get(row.code);
      assert.ok(item?.ui.title, row.code);
      assert.ok(Number(item.prices.CO) > 0, row.code);
      assert.equal(Number(item.prices.CO) * row.quantity, item.prices.CO * row.quantity);
    }
  });
}
