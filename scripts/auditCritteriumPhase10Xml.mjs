import { readFileSync } from 'node:fs';
import { CRITTERIUM8_FRAME_CATALOG, CRITTERIUM8_UPRIGHT_CATALOG,
  CRITTERIUM8_GROWTH_MODULE_CATALOG, CRITTERIUM8_CEILING_U_CODE } from '../src/mepal/critterium8/catalog/frameCatalog.js';
import { CRITTERIUM8_FORMICA_CODE_CATALOG } from '../src/mepal/critterium8/catalog/tileCatalog.js';
import { CRITTERIUM8_JUNCTION_PART_CATALOG } from '../src/mepal/critterium8/junctions/junctionPartCatalog.js';

const xml = readFileSync(new URL('../public/data/xml/ptsinbom_4.xml', import.meta.url), 'utf8');
const value = (record, name) => record.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() || '';
const records = [...xml.matchAll(/<Records>([\s\S]*?)<\/Records>/g)].map(match => match[1]);
const family = records.filter(record => value(record, 'LINEA_PRODUCTO') === 'CRITTERIUM 8');
const active = family.filter(record => value(record, 'ACTIVO').toUpperCase() !== 'FALSO');
const implemented = new Set([
  ...CRITTERIUM8_FRAME_CATALOG.map(row => row.code),
  ...CRITTERIUM8_UPRIGHT_CATALOG.map(row => row.code),
  ...CRITTERIUM8_GROWTH_MODULE_CATALOG.map(row => row.code),
  ...CRITTERIUM8_FORMICA_CODE_CATALOG.map(row => row.code),
  CRITTERIUM8_CEILING_U_CODE,
  ...Object.values(CRITTERIUM8_JUNCTION_PART_CATALOG).flatMap(row => [
    ...Object.values(row.halfHeight), ...Object.values(row.floorToCeiling),
  ]),
]);
const prices = new Map();
for (const name of ['PriceList_CO_2.xml', 'Pricelist_EUC_2.xml', 'PriceList_USD_2.xml']) {
  const content = readFileSync(new URL(`../public/data/xml/${name}`, import.meta.url), 'utf8');
  const country = name === 'PriceList_CO_2.xml' ? 'CO' : name === 'Pricelist_EUC_2.xml' ? 'EUC' : 'USD';
  const byCode = new Map();
  for (const match of content.matchAll(/<Articulo>([\s\S]*?)<\/Articulo>/g)) {
    const code = value(match[1], 'Codigo'), price = Number(value(match[1], 'Precio'));
    if (code) byCode.set(code, Number.isFinite(price) && price > 0 ? price : null);
  }
  prices.set(country, { currency: value(content, 'Moneda'), byCode });
}
const groups = new Map();
for (const record of active) {
  const code = value(record, 'CODIGO_PT');
  if (!code) continue;
  const type = value(record, 'TIPO') || 'SIN_TIPO';
  const subtype = value(record, 'SUBTIPO') || 'SIN_SUBTIPO';
  const key = `${type} / ${subtype}`;
  const group = groups.get(key) || { type, subtype, codes: new Set(), implemented: new Set(), pricedCO: new Set(), examples: [] };
  group.codes.add(code);
  if (implemented.has(code)) group.implemented.add(code);
  if (prices.get('CO').byCode.get(code)) group.pricedCO.add(code);
  if (group.examples.length < 2) group.examples.push({ code, description: value(record, 'DESCRIPCION_LARGA'), material: value(record, 'MATERIAL') });
  groups.set(key, group);
}
const rows = [...groups.values()].sort((a, b) => b.codes.size - a.codes.size || a.type.localeCompare(b.type))
  .map(group => ({ type: group.type, subtype: group.subtype, activeCodes: group.codes.size,
    inCurrentCode: group.implemented.size, pricedCO: group.pricedCO.size, examples: group.examples }));
console.log(JSON.stringify({ totalRecords: records.length, familyRecords: family.length,
  activeRecords: active.length, activeCodes: new Set(active.map(row => value(row, 'CODIGO_PT')).filter(Boolean)).size,
  currentCodeCount: implemented.size,
  priceCurrencies: Object.fromEntries([...prices].map(([country, item]) => [country, item.currency])),
  rows }, null, 2));
