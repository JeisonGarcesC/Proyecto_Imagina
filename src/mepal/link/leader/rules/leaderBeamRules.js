import { nominalCeilingClamped } from '../../rules/linkDimensionRules.js';
import { LINK_VIGA_CODES } from '../../rules/linkVigaRules.js';
import { LINK_LEADER_LEG_INSET_MM } from './leaderLayoutRules.js';

// Según mapa de producto p. 35: con caja grommet la viga nominal es 15 cm menor que la superficie principal.
export function resolveLinkLeaderBeam(config) {
  const hasGrommet = config.cableAccess === 'grommet' && config.components?.['surface-0']?.grommet !== false;
  const effectiveWidthMm = hasGrommet ? config.widthMm - 150 : config.widthMm;
  const nominal = nominalCeilingClamped(effectiveWidthMm, [1200, 1350, 1500, 1650, 1800]);
  const spanMm = config.widthMm - 2 * LINK_LEADER_LEG_INSET_MM;
  return {
    code: LINK_VIGA_CODES[nominal],
    nominalWidthMm: nominal,
    widthMm: spanMm,
    heightMm: 40,
    depthMm: 80,
  };
}

