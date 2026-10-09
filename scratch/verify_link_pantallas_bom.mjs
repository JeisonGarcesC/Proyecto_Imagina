import fs from 'fs';
import { buildLink } from '../src/mepal/link/builders/LinkBuilder.js';
import { resolveLinkBOM } from '../src/mepal/link/bom/linkBOM.js';
import { LINK_DEFAULT_CONFIG as D } from '../src/mepal/link/definitions/linkDefaults.js';

const d = JSON.parse(fs.readFileSync('./public/assets/data/tipologias/precios-detalle_filtrados.json', 'utf8'));
const a = Array.isArray(d) ? d : Object.values(d).flat();
const cat = new Map(a.filter(x => x.lista === 'MEPAL_CO_Nacionales').map(x => [x.producto_codigo, x]));

const show = (label, cfg) => {
  const p = buildLink({ ...D, ...cfg });
  const b = resolveLinkBOM(p);
  console.log('==', label, '|', b.status, b.missing.map(m => m.description).join('; '));
  for (const r of b.rows) {
    if (!/PANTALLA|FALDA|SOPORTE PANTALLA/.test((cat.get(r.code)?.producto_descripcion || r.description || '').toUpperCase())) continue;
    const c = cat.get(r.code);
    console.log('  x' + r.quantity, r.code, c ? `${c.precio} ${c.producto_descripcion}` : 'SIN CATALOGO ' + r.description);
  }
};

for (const depth of [600, 750]) for (const mat of ['formica', 'vidrio', 'tela', 'melamina']) {
  show(`doble 1 puesto ${depth} frontal ${mat} + lateral ${mat}`, { type: 'doble', puestos: 1, depthMm: depth, widthMm: 1500, hasPantallaFrontal: true, pantallaFrontalMaterial: mat, hasPantallaLateral: true, pantallaLateralMaterial: mat });
}
for (const mat of ['formica', 'vidrio']) {
  show(`sencillo 2 puestos 1800 falda ${mat} + lateral formica`, { type: 'sencillo', puestos: 2, depthMm: 600, widthMm: 1800, hasPantallaFalda: true, pantallaFaldaMaterial: mat, hasPantallaLateral: true, pantallaLateralMaterial: 'formica' });
}
