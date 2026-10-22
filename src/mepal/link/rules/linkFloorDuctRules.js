// Map pp. 14–15. Fixed height: these LINK parts are not rematable.
export const LINK_FLOOR_DUCT_RULES = {
  sencillo:{PINTADO:'22000011860',CROMADO:'22000114672',widthMm:104,heightMm:574,depthMm:100,modelSrc:'/assets/models/Link/Ductos/LKAC190000_IP.glb'},
  doble:{PINTADO:'22000009982',CROMADO:'22000119705',widthMm:100,heightMm:574,depthMm:216,modelSrc:'/assets/models/Link/Ductos/LKAC120000_DP.glb'},
};
export function resolveLinkFloorDuct(type,finish='PINTADO') {
  const rule=LINK_FLOOR_DUCT_RULES[type==='doble'?'doble':'sencillo'];
  return {...rule,code:rule[finish]};
}

