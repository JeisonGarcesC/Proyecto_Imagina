import fs from 'fs';

const d = JSON.parse(fs.readFileSync('./public/assets/data/tipologias/precios-detalle_filtrados.json', 'utf8'));
const a = Array.isArray(d) ? d : Object.values(d).flat();
const seen = new Set();
for (const x of a) {
  if (x.lista !== 'MEPAL_CO_Nacionales') continue;
  const t = x.producto_descripcion || '';
  if (!/PANTALLA|FALDA|FRONTAL|LATERAL/.test(t)) continue;
  if (!/LINK|LKAC|LKSO|LKPA|LKPN|LKFA/.test(t)) continue;
  if (seen.has(x.producto_codigo)) continue;
  seen.add(x.producto_codigo);
  console.log(x.producto_codigo, x.precio, t);
}
