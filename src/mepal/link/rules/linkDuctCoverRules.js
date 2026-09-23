// The supplied map references end covers but does not provide a standalone SKU.
// Preserve the requested visual and expose a partial BOM rather than billing Koncisa.
export const LINK_DUCT_COVER_RULES = {
  sencillo:{code:null,widthMm:3,heightMm:150,depthMm:140,modelSrc:'/assets/models/koncisaPlus/2KAC269000_100.glb'},
  doble:{code:null,widthMm:3,heightMm:130,depthMm:210,modelSrc:'/assets/models/koncisaPlus/2KAC250000_200.glb'},
};
export function resolveLinkDuctCover(type) {return LINK_DUCT_COVER_RULES[type==='doble'?'doble':'sencillo'];}

