import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appendPickListBomGroups } from '../src/picklist/pickListBomGroups.js';
import { resolveCatalogCommercialFields } from '../src/catalog/resolveCatalogCommercialFields.js';

const key = 'KONCISA_1793826805200_9324F6';
const commercialRows = ['22000132392', '22000132412', '22000132415', '22000132968']
  .map((code) => ({ code, source: 'CATALOG', tipologiaKey: key }));
const commercialGroup = () => ({ key: `T:${key}`, label: 'Koncisa Plus', items: [...commercialRows] });
const pick = (code, tipologiaKey = key) => ({ code, source: 'PICKLIST', tipologiaKey, description: 'prueba', unitPrice: 1000 });

test('A: cuatro comerciales y un PickList comparten un grupo plano', () => {
  const groups = appendPickListBomGroups([commercialGroup()], [pick('1234')], 'typology');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].pickListTypologyKey, key);
  assert.deepEqual(groups[0].items.map((row) => row.code), [...commercialRows.map((row) => row.code), '1234']);
  assert.equal(groups[0].items[4].source, 'PICKLIST');
});

test('B: PickList sin tipología queda en su grupo independiente', () => {
  const groups = appendPickListBomGroups([commercialGroup()], [pick('1234', null)], 'typology');
  assert.deepEqual(groups.map((group) => group.label), ['Koncisa Plus', 'PICKLIST']);
  assert.deepEqual(groups.map((group) => group.items.length), [4, 1]);
});

test('C: solo PickList con tipología muestra el encabezado de esa tipología', () => {
  const groups = appendPickListBomGroups([], [pick('1234')], 'typology');
  assert.deepEqual(groups.map((group) => group.label), [`TIPOLOGÍA - ${key}`]);
  assert.equal(groups[0].items.length, 1);
});

test('D: dos PickList con la misma tipología comparten grupo', () => {
  const groups = appendPickListBomGroups([], [pick('1234'), pick('5678')], 'typology');
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].items.map((row) => row.code), ['1234', '5678']);
});

test('E: dos tipologías distintas producen dos grupos', () => {
  const groups = appendPickListBomGroups([], [pick('1234', 'A'), pick('5678', 'B')], 'typology');
  assert.deepEqual(groups.map((group) => group.label), ['TIPOLOGÍA - A', 'TIPOLOGÍA - B']);
});

test('F: un grupo comercial sin PickList conserva identidad, filas y encabezado', () => {
  const original = commercialGroup();
  const groups = appendPickListBomGroups([original], [], 'typology');
  assert.deepEqual(groups, [original]);
  assert.equal(groups[0].pickListTypologyKey, undefined);
});

test('Koncisa usa descripción y precio comercial reales del XML por SKU', () => {
  const sku = '22000132392';
  const ptsXml = readFileSync(new URL('../public/data/xml/ptsinbom_4.xml', import.meta.url), 'utf8');
  const priceXml = readFileSync(new URL('../public/data/xml/PriceList_CO_2.xml', import.meta.url), 'utf8');
  const ptsRecord = ptsXml.match(new RegExp(`<Records>\\s*<CODIGO_PT>${sku}<\\/CODIGO_PT>([\\s\\S]*?)<\\/Records>`))?.[1];
  const priceRecord = priceXml.match(new RegExp(`<Articulo>\\s*<Codigo>${sku}<\\/Codigo>([\\s\\S]*?)<\\/Articulo>`))?.[1];
  assert.ok(ptsRecord);
  assert.ok(priceRecord);
  const description = ptsRecord.match(/<DESCRIPCION_LARGA>(.*?)<\/DESCRIPCION_LARGA>/)?.[1];
  const price = Number(priceRecord.match(/<Precio>(.*?)<\/Precio>/)?.[1]);
  const catalog = new Map([[sku, { ui: { title: description }, prices: { CO: price } }]]);
  const resolved = resolveCatalogCommercialFields(sku, catalog, 'CO', 'Costado terminal der RECT 600');
  assert.equal(resolved.description, 'COSTADO TERMINAL SENCILLO 60CM RECTANGULAR PINTADO KONCISA PLUS 2KSO330000');
  assert.equal(resolved.prices.CO, 259350);
  assert.equal(resolved.price, 259350);
  assert.equal(resolveCatalogCommercialFields(sku, new Map(), 'CO', 'Costado terminal der RECT 600').description, 'Costado terminal der RECT 600');
});
