export const LINK_CEILING_DUCT_RULES = {
  sencillo:{code:'22000111148',widthMm:178,heightMm:2550,depthMm:115,modelSrc:'/assets/models/Link/Ductos/LKAC820000_IT.glb'},
  doble:{code:'22000009983',widthMm:156,heightMm:2550,depthMm:250,modelSrc:'/assets/models/Link/Ductos/LKAC130000_DT.glb'},
};
export function resolveLinkCeilingDuct(type) {
  return LINK_CEILING_DUCT_RULES[type==='doble'?'doble':'sencillo'];
}

