import { nominalCeiling } from './linkDimensionRules.js';
// Map pp. 5–6. Geometry is temporarily borrowed; these are always LINK SKUs.
export const LINK_COSTADO_CODES = {
  sencillo: { terminal: { PINTADO: {600:'22000032441',750:'22000032442'}, CROMADO: {600:'22000033678',750:'22000033679'} },
    intermedio: { PINTADO: {600:'22000032443',750:'22000032444'}, CROMADO: {600:'22000033680',750:'22000033681'} } },
  doble: { terminal: { PINTADO: {600:'22000032435',750:'22000032436'}, CROMADO: {600:'22000033672',750:'22000033673'} },
    intermedio: { PINTADO: {600:'22000032439',750:'22000032440'}, CROMADO: {600:'22000033676',750:'22000033677'} } },
};
export const LINK_COSTADO_MODELS = {
  sencillo: {Link:'ELSO090000_60',Kuo:'ELSO090000_60'},
  doble: {Link:'ELSO060000_120',Kuo:'ELSO060000_120'},
};
// Model local axes are normalized by the visual adapter only, not by commercial rules.
export function resolveLinkCostado({type='sencillo',depthMm=600,terminal=true,shape='Link',supportFinish='PINTADO'}) {
  const seat=type==='doble'?'doble':'sencillo', nominal=nominalCeiling(depthMm,[600,750]);
  return {code:shape==='Link'?LINK_COSTADO_CODES[seat][terminal?'terminal':'intermedio'][supportFinish][nominal]:null,
    modelSrc:'/assets/models/Link/SuperficiePrincipal/'+LINK_COSTADO_MODELS[seat][shape]+'.glb',
    provisional:shape!=='Link', nominalDepthMm:nominal};
}

