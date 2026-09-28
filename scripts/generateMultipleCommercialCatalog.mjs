import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'public/data/xml/PriceList_CO_2.xml');
const target = path.join(root, 'src/mepal/multiple/catalog/multipleCommercialCatalog.generated.js');
const xml = fs.readFileSync(source, 'utf8');
const clean = (value) => String(value || '').replace(/&amp;/g, '&').replace(/&#160;|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const classify = (description) => {
  const d = description.toUpperCase();
  if (d.startsWith('BALDOSA ')) return 'TILE';
  if (d.startsWith('MARCO PUERTA')) return 'DOOR_FRAME';
  if (d.startsWith('NAVE PUERTA') || d.startsWith('HOJA PUERTA')) return 'DOOR_LEAF';
  if (d.includes('PUERTA')) return 'DOOR_ACCESSORY';
  if (d.startsWith('MARCO PANEL')) return 'FRAME';
  if (d.startsWith('TAPA ZOCALO')) return 'BASEBOARD';
  if (d.includes('DUCTO') || d.includes('CANALETA')) return 'CABLE_MANAGEMENT';
  if (d.includes('COLUMNA')) return 'COLUMN';
  if (d.includes('CRECIMIENTO')) return 'GROWTH';
  return 'ACCESSORY';
};
const variantOf = (description, type) => {
  const d = description.toUpperCase();
  if (type === 'DOOR_FRAME') {
    if (d.includes('DERECH')) return 'RIGHT';
    if (d.includes('IZQUIERD')) return 'LEFT';
  }
  if (type === 'TILE') {
    if (d.includes('GAMA 1')) return 'GAMA_1';
    if (d.includes('GAMA 2')) return 'GAMA_2';
    if (d.includes('PERFORAD')) return 'PERFORATED';
    if (d.includes('REPUJAD')) return 'EMBOSSED';
    if (d.includes(' LISA') || d.includes(' LISO')) return 'SMOOTH';
  }
  return null;
};
const materialOf = (description) => {
  const d = description.toUpperCase();
  for (const value of ['FORMICA', 'VIDRIO', 'TELA', 'LAMINA', 'METAL', 'ACUSTICA', 'PVC', 'ALUMINIO']) if (d.includes(value)) return value;
  return null;
};
const entries = [];
for (const match of xml.matchAll(/<Articulo>([\s\S]*?)<\/Articulo>/g)) {
  const block = match[1]; const codigoPT = clean(block.match(/<Codigo>(.*?)<\/Codigo>/)?.[1]);
  const description = clean(block.match(/<Descripcion>(.*?)<\/Descripcion>/)?.[1]);
  const price = Number(clean(block.match(/<Precio>(.*?)<\/Precio>/)?.[1]).replace(',', '.'));
  if (!codigoPT || !/MULTIPLE/i.test(description)) continue;
  const dimensions = [...description.matchAll(/(\d+(?:[.,]\d+)?)\s*X\s*(\d+(?:[.,]\d+)?)(?:\s*X\s*(\d+(?:[.,]\d+)?))?/gi)].map((item) => item.slice(1, 4).map((v) => v == null ? null : Number(v.replace(',', '.'))));
  const references = [...description.matchAll(/\b[A-Z]{2,}[A-Z0-9-]*\d{4,}\b/g)].map((item) => item[0]).filter((value) => value !== codigoPT);
  const type = classify(description);
  entries.push({ codigoPT, reference: references.at(-1) || null, family: 'MULTIPLE', type,
    width: dimensions[0]?.[1] ?? null, height: dimensions[0]?.[0] ?? null, thickness: dimensions[0]?.[2] ?? null,
    material: materialOf(description), finish: null, variant: variantOf(description, type), description,
    price: Number.isFinite(price) ? price : null, currency: 'COP',
    metadata: { source: 'PriceList_CO_2.xml', sharedLineDescription: /LINK|CRITTERIUM|FISSO/i.test(description), dimensions } });
}
const unique = [...new Map(entries.map((entry) => [`${entry.codigoPT}|${entry.description}`, entry])).values()];
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `// Generated from PriceList_CO_2.xml. Do not edit manually.\nexport const MULTIPLE_COMMERCIAL_CATALOG = Object.freeze(${JSON.stringify(unique, null, 2)}.map(Object.freeze));\n`, 'utf8');
const byType = unique.reduce((out, entry) => ({ ...out, [entry.type]: (out[entry.type] || 0) + 1 }), {});
console.log(JSON.stringify({ source, target, entries: unique.length, byType }, null, 2));
