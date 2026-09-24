import { linkPart } from '../../parts/linkParts.js';
import { resolveLinkCredenza } from '../rules/leaderCredenzaRules.js';
export function createLeaderCredenza(config,layout) {
  const r=resolveLinkCredenza(config);
  return linkPart('CREDENZA','leader-credenza',[r.widthMm,r.heightMm,r.depthMm],
    [layout.sign*(layout.widthMm/2-r.depthMm/2),r.heightMm/2,-r.widthMm/2+config.depthMm/2],r.code,
    'LINK credenza para cableado dos gavetas archivo '+config.side,
    {rotationY:layout.returnRotation,materialRole:'pedestal',materialBase:'FORMICA',model:{kind:'glb',src:r.modelSrc},
      meta:{category:'leader-credenzas',layoutType:'LEADER',leaderRole:'CREDENZA'}});
}
