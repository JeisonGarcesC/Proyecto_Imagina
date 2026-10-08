import { LINK_DIMENSIONS as D } from '../definitions/linkDefaults.js';
import { LINK_FINISH_CODES, LINK_FINISH_OPTIONS, LINK_SURFACE_POSITION_CODES, LINK_INTEGRACION_INDIVIDUAL_CODES, LINK_INTEGRACION_DOBLE_CODES } from './linkSurfaceFinishOptions.js';
import { nominalCeiling, nominalCeilingClamped } from './linkDimensionRules.js';

// Código de la superficie de integración según tipo ('individual'|'recta'|'redonda'|'curva'), acabado,
// lado (solo individual) y fondo nominal de la mesa (config.depthMm, no el fondo total de la mesa doble).
export function resolveLinkIntegracionCode(config, type, side = null) {
  const family = /_T1_/.test(config.finishId || '') ? 'TIPO1' : /_T2_/.test(config.finishId || '') ? 'TIPO2' : 'FORMICA';
  const depth = nominalCeiling(config.depthMm, [600, 750]);
  if (type === 'individual') return side ? LINK_INTEGRACION_INDIVIDUAL_CODES[family][side]?.[depth] || null : null;
  const codes = LINK_INTEGRACION_DOBLE_CODES[type];
  return codes ? codes[family][depth] || codes.FORMICA[depth] : null;
}

// Posición de la superficie dentro de la fila: 'individual' (un solo puesto, sencillo o doble),
// 'terminal' (primer/último puesto) o 'intermedia' (resto). Una mesa doble con superficie de
// integración ya no es individual: sus superficies principales se piden como terminal.
export function resolveLinkSurfacePosition(config, moduleIndex = 0) {
  const puestos = config.puestos || 1;
  const dobleConIntegracion = config.type === 'doble' && ['recta', 'redonda', 'curva'].includes(config.integracionType);
  if (puestos <= 1) return config.surfaceMode === 'plena' || dobleConIntegracion ? 'terminal' : 'individual';
  return moduleIndex === 0 || moduleIndex === puestos - 1 ? 'terminal' : 'intermedia';
}

export function resolveLinkSurface(config, position = 'intermedia') {
  const finish = LINK_FINISH_OPTIONS.find(option => option.id === config.finishId);
  if (!finish) throw new Error('Acabado de superficie LINK no disponible.');
  const width = nominalCeilingClamped(config.widthMm, [1200, 1500, 1800]);
  const depth = nominalCeiling(config.depthMm, [600, 750]);
  const index = [1200, 1500, 1800].indexOf(width) + (depth === 750 ? 3 : 0);
  const positionCode = position === 'intermedia' ? null
    : LINK_SURFACE_POSITION_CODES[config.surfaceMode]?.[position]?.[finish.id]?.[index];
  return { ...finish, code: positionCode || LINK_FINISH_CODES[config.surfaceMode][finish.id][index] };
}

export function resolveLinkPrincipalDepth(depthMm) {
  return { surfaceDepthMm: depthMm, gapMm: D.principalGapMm, totalDepthMm: depthMm * 2 + D.principalGapMm };
}

// Map p. 22: each plena adds 13 mm. The two extra halves occupy the
// principal's 26 mm gap, with no additional gap between the plena tops.
export function resolveLinkPlenaDepth(depthMm) {
  const surfaceDepthMm = depthMm + D.plenaExtraDepthMm;
  return { surfaceDepthMm, gapMm: 0, totalDepthMm: surfaceDepthMm * 2 };
}

export function resolveLinkSurfaceLayout(config) {
  if (config.type !== 'doble') return { surfaceDepthMm: config.depthMm, gapMm: 0, totalDepthMm: config.depthMm, centersZMm: [0] };
  const layout = config.surfaceMode === 'plena'
    ? resolveLinkPlenaDepth(config.depthMm) : resolveLinkPrincipalDepth(config.depthMm);
  const center = (layout.surfaceDepthMm + layout.gapMm) / 2;
  return { ...layout, centersZMm: [-center, center] };
}
