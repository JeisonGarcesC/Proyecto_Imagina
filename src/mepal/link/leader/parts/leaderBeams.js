import { linkPart } from '../../parts/linkParts.js';
import { resolveLinkLeaderBeam } from '../rules/leaderBeamRules.js';
import { resolveLinkCredenzaBeam } from '../rules/leaderCredenzaRules.js';
export function createLeaderMainBeam(config,mainSurface){
  const rule=config.leaderCredenza?resolveLinkCredenzaBeam(config.widthMm):resolveLinkLeaderBeam(config,!!mainSurface.grommetHole);
  return linkPart('STRUCTURE','beam-0',[rule.widthMm,rule.heightMm,rule.depthMm],[0,710-rule.heightMm/2,0],rule.code,
    'LINK viga principal líder',{model:{kind:'glb',src:rule.modelSrc},meta:{category:'vigas',layoutType:'LEADER',leaderRole:'MAIN'}});
}
