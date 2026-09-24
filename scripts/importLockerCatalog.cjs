// Offline extraction only: never evaluates formulas or executes VBA/CM.
const fs = require('node:fs');
const XLSX = require('xlsx');
const source = 'public/assets/MapaProductoYFichasTecnicas/Lockers/ayudaVentasLockers.xlsm';
const workbook = XLSX.readFile(source);
const entries = [];
for (const calibre of [22, 24]) {
  const sheet = `Codigos ${calibre}`;
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 });
  rows.forEach((row, index) => {
    if (!/^\d{11}$/.test(String(row[1]))) return;
    entries.push({ calibre, code: String(row[1]), description: row[2], type: row[3] || null,
      material: row[4] || null, heightMm: row[5] ? Number(row[5]) * 10 : null,
      active: !row[2].startsWith('CODIGO INACTIVO'), source: `${sheet}!B${index + 1}` });
  });
}
fs.mkdirSync('src/mepal/lockers/catalog', { recursive: true });
fs.writeFileSync('src/mepal/lockers/catalog/lockerDocumentedCatalog.js',
  '// Extracted verbatim by scripts/importLockerCatalog.cjs. Do not synthesize codes.\nexport const lockerDocumentedCatalog = ' + JSON.stringify(entries, null, 2) + ';\n');
console.log(`Extracted ${entries.length} documented records.`);
