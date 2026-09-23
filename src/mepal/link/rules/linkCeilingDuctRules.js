export const LINK_CEILING_DUCT_RULES = {
  sencillo:{code:'22000111148',widthMm:90,heightMm:2520,depthMm:100,modelSrc:'/assets/models/koncisaPlus/2KSO334000.glb'},
  doble:{code:'22000009983',widthMm:200,heightMm:2520,depthMm:100,modelSrc:'/assets/models/koncisaPlus/2KSO327000.glb'},
};
export function resolveLinkCeilingDuct(type) {
  return LINK_CEILING_DUCT_RULES[type==='doble'?'doble':'sencillo'];
}

