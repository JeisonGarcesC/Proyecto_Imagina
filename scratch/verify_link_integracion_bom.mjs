import fs from 'fs';
import { buildLink } from '../src/mepal/link/builders/LinkBuilder.js';
import { resolveLinkBOM } from '../src/mepal/link/bom/linkBOM.js';
import { LINK_DEFAULT_CONFIG as D } from '../src/mepal/link/definitions/linkDefaults.js';

const d = JSON.parse(fs.readFileSync('./public/assets/data/tipologias/precios-detalle_filtrados.json', 'utf8'));
const a = Array.isArray(d) ? d : Object.values(d).flat();
const cat = new Map(a.filter(x => x.lista === 'MEPAL_CO_Nacionales').map(x => [x.producto_codigo, x]));

for (const depth of [600, 750]) {
  for (const f of ['FORMICA_30', 'FORMICENTRO_T1_30', 'FORMICENTRO_T2_30']) {
    const p = buildLink({ ...D, type: 'sencillo', puestos: 1, depthMm: depth, finishId: f, integracionType: 'individual', integracionSide: 'ambas' });
    const rows = resolveLinkBOM(p).rows.filter(r => /integraci/i.test(r.description));
    for (const r of rows) {
      const c = cat.get(r.code);
      console.log(depth, f, r.code, c ? `${c.precio} ${c.producto_descripcion}` : 'SIN CATALOGO');
    }
  }
}
