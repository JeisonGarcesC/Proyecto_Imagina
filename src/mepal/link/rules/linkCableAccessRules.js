export const LINK_GROMMET_RULES = {
  standard: {ALUMINIUM:'22000023626',PAINTED:'22000116523',widthMm:510},
  leader: {ALUMINIUM:'22000126724',PAINTED:'22000126725',widthMm:430},
};
export function resolveLinkGrommet({leader=false,finish='ALUMINIUM'}={}) {
  const rule=LINK_GROMMET_RULES[leader?'leader':'standard'];
  return {code:rule[finish],widthMm:rule.widthMm,heightMm:30,depthMm:100,
    modelSrc:'/assets/models/koncisaPlus/LKAC250000.glb'};
}

