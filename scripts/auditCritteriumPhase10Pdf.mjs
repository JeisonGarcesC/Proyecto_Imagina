import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const sources = [
  ['mapa', 'public/assets/MapaProductoYFichasTecnicas/Critterium8/Criterium.pdf'],
  ['ficha', 'public/assets/MapaProductoYFichasTecnicas/Critterium8/Ficha tecnica criterium.pdf'],
];

for (const [name, source] of sources) {
  const data = new Uint8Array(readFileSync(resolve(source)));
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();
    pages.push(`\n=== ${name.toUpperCase()} PAGE ${index} ===\n${content.items.map(item => item.str).join(' ')}\n`);
  }
  const destination = resolve(`.phase10-${name}-pdf.txt`);
  writeFileSync(destination, pages.join(''), 'utf8');
  console.log(`${name}: ${pdf.numPages} pages -> ${destination}`);
}
