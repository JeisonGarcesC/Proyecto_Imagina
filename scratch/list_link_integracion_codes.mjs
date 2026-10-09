import fs from 'fs';

const d = JSON.parse(fs.readFileSync('./public/assets/data/tipologias/precios-detalle_filtrados.json', 'utf8'));
const a = Array.isArray(d) ? d : Object.values(d).flat();
const seen = new Set();
for (const x of a) {
  if (x.lista !== 'MEPAL_CO_Nacionales') continue;
  if (!/SUPERFICIE INTEGRACION|LKSU0200|LKSU0201[0-9]0|LKSU0202/.test(x.producto_descripcion || '')) continue;
  if (/LKSU020160/.test(x.producto_descripcion)) continue;
  if (seen.has(x.producto_codigo)) continue;
  seen.add(x.producto_codigo);
  console.log(x.producto_codigo, x.precio, x.producto_descripcion);
}
