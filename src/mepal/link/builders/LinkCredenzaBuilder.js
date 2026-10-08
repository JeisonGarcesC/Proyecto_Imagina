import { createCredenzaExe } from '../parts/credenzasExe.js';

export function buildLinkCredenza(config) {
  const credenza = createCredenzaExe(config);
  const [widthMm, heightMm, depthMm] = credenza.dimensions;
  return {
    parts: [credenza],
    layout: { surfaceDepthMm: depthMm, gapMm: 0, totalDepthMm: depthMm, centersZMm: [0] },
    leader: false,
    bounds: { widthMm, depthMm, heightMm },
  };
}
