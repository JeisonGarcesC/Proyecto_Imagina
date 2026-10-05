import { readFileSync, writeFileSync } from 'node:fs';
import { CRITTERIUM8_FRAME_CATALOG, CRITTERIUM8_UPRIGHT_CATALOG, CRITTERIUM8_GROWTH_MODULE_CATALOG, CRITTERIUM8_CEILING_U_CODE } from '../src/mepal/critterium8/catalog/frameCatalog.js';
import { CRITTERIUM8_FORMICA_CODE_CATALOG } from '../src/mepal/critterium8/catalog/tileCatalog.js';
import { CRITTERIUM8_JUNCTION_PART_CATALOG } from '../src/mepal/critterium8/junctions/junctionPartCatalog.js';

const tag = (xml, name) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() || '';
const pts = readFileSync(new URL('../public/data/xml/ptsinbom_4.xml', import.meta.url), 'utf8');
const records = [...pts.matchAll(/<Records>([\s\S]*?)<\/Records>/g)].map((match) => match[1]);
const active = records.filter((record) => /CRITTERIUM\s*8/i.test(tag(record, 'LINEA_PRODUCTO')) && tag(record, 'ACTIVO').toUpperCase() !== 'FALSO');
const byCode = new Map(active.map((record) => [tag(record, 'CODIGO_PT'), record]).filter(([code]) => code));
const implemented = new Set([
  ...CRITTERIUM8_FRAME_CATALOG.map((item) => item.code),
  ...CRITTERIUM8_UPRIGHT_CATALOG.map((item) => item.code),
  ...CRITTERIUM8_GROWTH_MODULE_CATALOG.map((item) => item.code),
  ...CRITTERIUM8_FORMICA_CODE_CATALOG.map((item) => item.code),
  CRITTERIUM8_CEILING_U_CODE,
  ...Object.values(CRITTERIUM8_JUNCTION_PART_CATALOG).flatMap((item) => [...Object.values(item.halfHeight), ...Object.values(item.floorToCeiling)]),
]);
const lists = Object.fromEntries(Object.entries({ CO: 'PriceList_CO_2.xml', EUC: 'Pricelist_EUC_2.xml', USD: 'PriceList_USD_2.xml' }).map(([country, file]) => {
  const xml = readFileSync(new URL(`../public/data/xml/${file}`, import.meta.url), 'utf8');
  const prices = new Map();
  for (const match of xml.matchAll(/<Articulo>([\s\S]*?)<\/Articulo>/g)) {
    const code = tag(match[1], 'Codigo');
    if (!code) continue;
    const price = tag(match[1], 'Precio');
    if (prices.has(code) && prices.get(code) !== price) prices.set(code, 'AMBIGUOUS');
    else if (!prices.has(code)) prices.set(code, price);
  }
  return [country, { currency: tag(xml, 'Moneda'), prices }];
}));
const csv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const columns = ['codigo', 'fuente', 'en_configurador', 'tipo', 'subtipo', 'descripcion', 'referencia_plano', 'material_PT', 'acabado_comercial',
  'precio_CO', 'moneda_CO', 'estado_CO', 'precio_EUC', 'moneda_EUC', 'estado_EUC', 'precio_USD', 'moneda_USD', 'estado_USD'];
const lines = [columns.map(csv).join(',')];
for (const code of [...new Set([...byCode.keys(), ...implemented])].sort()) {
  const record = byCode.get(code);
  const row = [code, record ? 'PT_CRITTERIUM_8' : 'MAPA_PRODUCTO', implemented.has(code) ? 'SI' : 'NO',
    tag(record || '', 'TIPO'), tag(record || '', 'SUBTIPO'), tag(record || '', 'DESCRIPCION_LARGA'),
    tag(record || '', 'NUMERO_PLANO'), tag(record || '', 'MATERIAL'), 'NO_DOCUMENTADO'];
  for (const country of ['CO', 'EUC', 'USD']) {
    const { currency, prices } = lists[country];
    const price = prices.get(code);
    row.push(price && price !== 'AMBIGUOUS' ? price : '', currency,
      price === 'AMBIGUOUS' ? 'COMMERCIAL_AMBIGUOUS' : Number(price) > 0 ? 'PRICED' : 'CODE_WITHOUT_PRICE');
  }
  lines.push(row.map(csv).join(','));
}
const output = new URL('../docs/CRITERIUM_CATALOG_MATRIX_PHASE7_2.csv', import.meta.url);
writeFileSync(output, `${lines.join('\n')}\n`, 'utf8');
console.log(`CRITERIUM catalog matrix: ${lines.length - 1} rows, ${byCode.size} active PT, ${implemented.size} implemented, ${Object.keys(lists).join('/')}`);
for (const country of ['CO', 'EUC', 'USD']) {
  const prices = lists[country].prices;
  const count = (codes) => [...codes].filter((code) => Number(prices.get(code)) > 0).length;
  console.log(`${country}: active PT ${count(byCode.keys())}/${byCode.size}; implemented ${count(implemented)}/${implemented.size}`);
}
