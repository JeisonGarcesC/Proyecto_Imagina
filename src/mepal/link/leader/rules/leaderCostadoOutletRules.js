import { nominalCeiling } from '../../rules/linkDimensionRules.js';
export const LINK_LEADER_OUTLET_CODES={600:'22000135006',750:'22000135007'};
export function resolveLeaderCostadoOutlet(depthMm,shape='RECT',finish='PINTADO'){
  return {code:shape==='RECT'&&finish==='PINTADO'?LINK_LEADER_OUTLET_CODES[nominalCeiling(depthMm,[600,750])]:null,
    modelSrc:'/assets/models/koncisaPlus/CAJA_TOMAS_COSTADO.glb'};
}

