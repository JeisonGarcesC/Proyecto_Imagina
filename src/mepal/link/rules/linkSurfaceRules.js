import { LINK_DIMENSIONS as D } from '../definitions/linkDefaults.js';
import { LINK_FINISH_CODES, LINK_FINISH_OPTIONS } from './linkSurfaceFinishOptions.js';
import { nominalCeiling } from './linkDimensionRules.js';

export function resolveLinkSurface(config) {
  const finish = LINK_FINISH_OPTIONS.find(option => option.id === config.finishId);
  if (!finish) throw new Error('Acabado de superficie LINK no disponible.');
  const width = nominalCeiling(config.widthMm, [1200, 1500, 1800]);
  const depth = nominalCeiling(config.depthMm, [600, 750]);
  const index = [1200, 1500, 1800].indexOf(width) + (depth === 750 ? 3 : 0);
  return { ...finish, code: LINK_FINISH_CODES[config.surfaceMode][finish.id][index] };
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
