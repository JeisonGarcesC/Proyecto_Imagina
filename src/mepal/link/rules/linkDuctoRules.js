import { nominalCeiling } from './linkDimensionRules.js';
// Map pp. 9–10. Only INTERMEDIO is offered; no Koncisa commercial variants.
export const LINK_DUCTO_RULES = {
  sencillo: {codes:{1200:'22000021979',1500:'22000021980',1800:'22000021981'},heightMm:150,depthMm:140,
    modelSrc:'/assets/models/koncisaPlus/2KSO326000_120.glb'},
  doble: {codes:{1200:'22000021976',1500:'22000021977',1800:'22000021978'},heightMm:130,depthMm:210,
    modelSrc:'/assets/models/koncisaPlus/2KSO326000_120.glb'},
};
export function resolveLinkDucto({type='sencillo',widthMm=1200,moduleIndex=0,puestos=1}) {
  const rule=LINK_DUCTO_RULES[type==='doble'?'doble':'sencillo'];
  const leftInset=moduleIndex===0?25:0,rightInset=moduleIndex===puestos-1?25:0;
  return {...rule,code:rule.codes[nominalCeiling(widthMm,[1200,1500,1800])],widthMm:widthMm-leftInset-rightInset,
    offsetXMm:(leftInset-rightInset)/2,tipoModulo:'INTERMEDIO'};
}

