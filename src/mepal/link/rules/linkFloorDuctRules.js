// Map pp. 14–15. Fixed height: these LINK parts are not rematable.
export const LINK_FLOOR_DUCT_RULES = {
  sencillo:{PINTADO:'22000011860',CROMADO:'22000114672',widthMm:90,heightMm:530,depthMm:100,modelSrc:'/assets/models/koncisaPlus/2KSO333000.glb'},
  doble:{PINTADO:'22000009982',CROMADO:'22000119705',widthMm:200,heightMm:530,depthMm:100,modelSrc:'/assets/models/koncisaPlus/2KSO325000.glb'},
};
export function resolveLinkFloorDuct(type,finish='PINTADO') {
  const rule=LINK_FLOOR_DUCT_RULES[type==='doble'?'doble':'sencillo'];
  return {...rule,code:rule[finish]};
}

