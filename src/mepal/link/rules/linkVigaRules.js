import { nominalCeiling } from './linkDimensionRules.js';
export const LINK_VIGA_CODES = {1200:'22000032566',1350:'22000032567',1500:'22000032568',1650:'22000032569',1800:'22000032570'};
export function resolveLinkViga(widthMm) {
  const nominal=nominalCeiling(widthMm,[1200,1350,1500,1650,1800]);
  return {code:LINK_VIGA_CODES[nominal],nominalWidthMm:nominal,widthMm:widthMm-130,heightMm:80,depthMm:80};
}

