// Tapa terminal del ducto cableado (LKAC320000 / código 22000034843, mapa de producto p. 24 y ficha técnica p. 2).
// Nota comercial: El costado terminal ya incluye la tapa ducto en su catálogo y fabricación, por lo que no se factura por aparte en el BOM de Link.
export const LINK_DUCT_COVER_RULES = {
  sencillo:{code:'22000034843',widthMm:3,heightMm:150,depthMm:140,modelSrc:'/assets/models/koncisaPlus/2KAC269000_100.glb'},
  doble:{code:'22000034843',widthMm:3,heightMm:170,depthMm:280,modelSrc:'/assets/models/koncisaPlus/2KAC250000_200.glb'},
};
export function resolveLinkDuctCover(type) {return LINK_DUCT_COVER_RULES[type==='doble'?'doble':'sencillo'];}

