import { resolveLinkViga } from '../../rules/linkVigaRules.js';
// Con la superficie Link estándar la viga también es la estándar del puesto.
export function resolveLinkLeaderBeam(config) {return resolveLinkViga(config.widthMm);}

