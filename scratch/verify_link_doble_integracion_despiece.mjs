import fs from 'fs';
import { buildLink } from '../src/mepal/link/builders/LinkBuilder.js';
import { resolveLinkBOM } from '../src/mepal/link/bom/linkBOM.js';
import { LINK_DEFAULT_CONFIG as D } from '../src/mepal/link/definitions/linkDefaults.js';

const d = JSON.parse(fs.readFileSync('./public/assets/data/tipologias/precios-detalle_filtrados.json', 'utf8'));
const a = Array.isArray(d) ? d : Object.values(d).flat();
const cat = new Map(a.filter(x => x.lista === 'MEPAL_CO_Nacionales').map(x => [x.producto_codigo, x]));

const show = (label, cfg) => {
  const p = buildLink({ ...D, type: 'doble', ...cfg });
  console.log('==', label);
  for (const r of resolveLinkBOM(p).rows) {
    const c = cat.get(r.code);
    console.log('  x' + r.quantity, r.code, c ? `${c.precio} ${c.producto_descripcion}` : 'SIN PRECIO/CATALOGO');
  }
};

show('doble 1 puesto 60, recta izquierda', { puestos: 1, depthMm: 600, widthMm: 1200, integracionType: 'recta', integracionSide: 'izquierda' });
show('doble 1 puesto 60, recta ambas', { puestos: 1, depthMm: 600, widthMm: 1200, integracionType: 'recta', integracionSide: 'ambas' });
show('doble 2 puestos 75, curva derecha', { puestos: 2, depthMm: 750, widthMm: 1200, integracionType: 'curva', integracionSide: 'derecha' });
show('doble 1 puesto 60 cromado, redonda derecha', { puestos: 1, depthMm: 600, widthMm: 1200, supportFinish: 'CROMADO', integracionType: 'redonda', integracionSide: 'derecha' });
show('doble 1 puesto 60 sin integracion', { puestos: 1, depthMm: 600, widthMm: 1200, integracionType: 'ninguna' });
