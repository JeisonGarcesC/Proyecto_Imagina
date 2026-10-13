import { resolveLinkCredenzaSurface } from './leaderCredenzaRules.js';
// Con credenza la superficie es la de cableado a credenza; sin ella el líder usa la superficie Link estándar (ver superficies.js).
export function resolveLinkLeaderSurface(config) {
  return resolveLinkCredenzaSurface(config);
}
