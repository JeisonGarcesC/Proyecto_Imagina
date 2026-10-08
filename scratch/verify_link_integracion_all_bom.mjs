import fs from 'fs';
import { buildLink } from '../src/mepal/link/builders/LinkBuilder.js';
import { resolveLinkBOM } from '../src/mepal/link/bom/linkBOM.js';
import { LINK_DEFAULT_CONFIG as D } from '../src/mepal/link/definitions/linkDefaults.js';

const d = JSON.parse(fs.readFileSync('./public/assets/data/tipologias/precios-detalle_filtrados.json', 'utf8'));
const a = Array.isArray(d) ? d : Object.values(d).flat();
const cat = new Map(a.filter(x => x.lista === 'MEPAL_CO_Nacionales').map(x => [x.producto_codigo, x]));

const cases = [];
for (const depth of [600, 750]) {
  for (const f of ['FORMICA_30', 'FORMICENTRO_T1_30', 'FORMICENTRO_T2_30']) {
    for (const [type, integ] of [['sencillo', 'individual'], ['doble', 'recta'], ['doble', 'redonda'], ['doble', 'curva']]) {
      cases.push({ depth, f, type, integ });
    }
  }
}
for (const { depth, f, type, integ } of cases) {
  const p = buildLink({ ...D, type, puestos: 1, depthMm: depth, finishId: f, integracionType: integ, integracionSide: 'ambas' });
  const rows = resolveLinkBOM(p).rows.filter(r => /integraci/i.test(r.description) || /^LINK_SUPERFICIE_INT$/.test(r.code));
  for (const r of rows) {
    const c = cat.get(r.code);
    console.log(depth, f, integ, 'x' + r.quantity, r.code, c ? `${c.precio} ${c.producto_descripcion}` : 'SIN CATALOGO');
  }
}
