import { nominalCeiling } from '../../rules/linkDimensionRules.js';
// Link Exe pp. 28–30: two file drawers, fixed 120/150 cm, not rematable.
export const LINK_CREDENZA_CODES={izquierda:{1200:'22000044143',1500:'22000044145'},derecha:{1200:'22000044144',1500:'22000044146'}};
export const LINK_CREDENZA_MODELS={izquierda:'/assets/models/koncisaPlus/22000137112.glb',derecha:'/assets/models/koncisaPlus/22000137110.glb'};
export const LINK_CREDENZA_SURFACE_CODES={600:{1500:'22000044163',1650:'22000044164',1800:'22000044165'},750:{1500:'22000044166',1650:'22000044167',1800:'22000044168'}};
export function resolveLinkCredenza(config) {
  return {code:LINK_CREDENZA_CODES[config.side][config.leaderCredenzaLengthMm],modelSrc:LINK_CREDENZA_MODELS[config.side],
    widthMm:config.leaderCredenzaLengthMm,heightMm:640,depthMm:500};
}
export function resolveLinkCredenzaSurface(config) {
  return {code:LINK_CREDENZA_SURFACE_CODES[nominalCeiling(config.depthMm,[600,750])][nominalCeiling(config.widthMm,[1500,1650,1800])],
    thickMm:30,materialBase:'FORMICA',label:'Fórmica 30 mm · cableado a credenza'};
}
export function resolveLinkCredenzaBeam(widthMm) {
  const nominal=nominalCeiling(widthMm,[1500,1650,1800]);
  return {code:{1500:'22000044169',1650:'22000044170',1800:'22000044171'}[nominal],widthMm:widthMm-75,heightMm:70,depthMm:570,
    modelSrc:'/assets/models/koncisaPlus/2KSO382000_VigaConectora.glb'};
}

