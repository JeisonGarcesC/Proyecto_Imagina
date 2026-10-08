import { buildLink } from '../src/mepal/link/builders/LinkBuilder.js';
import { resolveLinkBOM } from '../src/mepal/link/bom/linkBOM.js';
import { LINK_DEFAULT_CONFIG as D } from '../src/mepal/link/definitions/linkDefaults.js';

for (const [label, cfg] of [
  ['defecto (formica) 1200', { type: 'doble', puestos: 1, widthMm: 1200, hasPantallaFrontal: true }],
  ['vidrio 1200', { type: 'doble', puestos: 1, widthMm: 1200, hasPantallaFrontal: true, pantallaFrontalMaterial: 'vidrio' }],
  ['vidrio 1200 x2 puestos', { type: 'doble', puestos: 2, widthMm: 1200, hasPantallaFrontal: true, pantallaFrontalMaterial: 'vidrio' }],
  ['vidrio 1500 sencillo (sin frontal)', { type: 'sencillo', puestos: 1, widthMm: 1500, hasPantallaFrontal: true, pantallaFrontalMaterial: 'vidrio' }],
]) {
  const p = buildLink({ ...D, ...cfg });
  const rows = resolveLinkBOM(p).rows.filter(r => /PANTALLA/i.test(r.description) || /^22000(021|103|130)/.test(r.code));
  console.log(label, '=>', rows.map(r => `${r.quantity}x ${r.code}`).join(', ') || '(sin pantalla en BOM)', '| frontal parts:', p.parts.filter(x => x.role === 'PANTALLA_FRONTAL_BOARD').map(x => `${x.key}:${x.code}`).join(' '));
}
