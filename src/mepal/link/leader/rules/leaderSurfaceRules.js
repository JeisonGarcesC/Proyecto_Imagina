import { LINK_FINISH_CODES, LINK_FINISH_OPTIONS } from '../../rules/linkSurfaceFinishOptions.js';
import { nominalCeiling } from '../../rules/linkDimensionRules.js';
import { resolveLinkCredenzaSurface } from './leaderCredenzaRules.js';
export const LINK_LEADER_MAIN_CODES = {
  600:{1500:'22000135011',1650:'22000135013',1800:'22000135015'},
  750:{1500:'22000135012',1650:'22000135014',1800:'22000135016'},
};
export const LINK_LEADER_RETURN_CODES = {
  derecha:{900:'22000135017',1000:'22000135018'},izquierda:{900:'22000135019',1000:'22000135020'},
};
export function resolveLinkLeaderSurface(config,component,role) {
  if (role === 'MAIN' && config.leaderCredenza) return resolveLinkCredenzaSurface(config);
  const finish=LINK_FINISH_OPTIONS.find(f=>f.id===component.finishId);
  let code;
  if(role==='RETURN')code=(finish.thickMm===25?LINK_FINISH_CODES.return25:LINK_LEADER_RETURN_CODES)[config.side][nominalCeiling(config.returnLengthMm,[900,1000])];
  else code=(finish.thickMm===25?LINK_FINISH_CODES.leader25:LINK_LEADER_MAIN_CODES)[nominalCeiling(config.depthMm,[600,750])][nominalCeiling(config.widthMm,[1500,1650,1800])];
  return {...finish,code};
}
