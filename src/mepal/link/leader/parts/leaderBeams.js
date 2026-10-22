import { linkPart } from '../../parts/linkParts.js';
import { resolveLinkLeaderBeam } from '../rules/leaderBeamRules.js';
import { resolveLinkCredenzaBeam } from '../rules/leaderCredenzaRules.js';
import { LINK_LEADER_LEG_INSET_MM } from '../rules/leaderLayoutRules.js';

export function createLeaderMainBeam(config, layout){
  const rule=config.leaderCredenza?resolveLinkCredenzaBeam(config.widthMm):resolveLinkLeaderBeam(config);
  const widthMm=config.leaderCredenza?rule.widthMm:(layout?.widthMm?layout.widthMm-2*LINK_LEADER_LEG_INSET_MM:rule.widthMm);
  return linkPart('STRUCTURE','beam-0',[widthMm,rule.heightMm,rule.depthMm],[0,710-rule.heightMm/2,0],rule.code,
    'LINK viga principal líder',{model:{kind:'glb',src:rule.modelSrc},meta:{category:'vigas',layoutType:'LEADER',leaderRole:'MAIN'}});
}
