import { resolveLinkViga } from '../../rules/linkVigaRules.js';
// Map p. 35: main grommet shortens the beam nominal by 150 mm.
export function resolveLinkLeaderBeam(config,hasGrommet) {return resolveLinkViga(config.widthMm-(hasGrommet?150:0));}

