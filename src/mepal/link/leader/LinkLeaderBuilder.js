import { resolveLinkLeaderLayout } from './rules/leaderLayoutRules.js';
import { createLeaderMainSurface,createLeaderReturnSurface } from './parts/leaderSurfaces.js';
import { createLeaderMainBeam } from './parts/leaderBeams.js';
import { createLeaderCredenza } from './parts/leaderCredenzas.js';
import { createLeaderSurfaceAccessories,createLeaderUnionPlates,createLeaderPedestal } from './parts/leaderAccessories.js';
import { createCostado } from '../parts/costados.js';
import { createGrommet } from '../parts/grommets.js';
import { createDucto,createDuctAccessories } from '../parts/ductos.js';
import { linkPart } from '../parts/linkParts.js';
import { resolveLeaderCostadoOutlet } from './rules/leaderCostadoOutletRules.js';

export function buildLinkLeader(config) {
  const layout=resolveLinkLeaderLayout(config),parts=[];
  const main=createLeaderMainSurface(config,layout);
  parts.push(main,createLeaderMainBeam(config,main));
  parts.push(createCostado({config,key:'support-0',depthMm:config.depthMm-10,position:[layout.freeX,355,0],leaderRole:'MAIN_FREE_END'}));
  const tops=[main];
  if(config.leaderCredenza)parts.push(createLeaderCredenza(config,layout));
  else {
    const junction=createCostado({config,key:'support-1',depthMm:config.depthMm-10,position:[layout.junctionX,355,0],leaderRole:'MAIN_RETURN_JUNCTION'});
    parts.push(junction);
    if(junction.componentConfig.hasOutletBox){
      const rule=resolveLeaderCostadoOutlet(config.depthMm);
      parts.push(linkPart('OUTLET_BOX','junction-outlet',[80,80,200],[layout.junctionX-layout.sign*50,650,0],null,
        'Caja tomas incluida en costado LINK',{excludeFromBOM:true,model:{kind:'glb',src:rule.modelSrc},configTargetKey:junction.key,
          componentConfig:junction.componentConfig,meta:{category:'cajas-tomas'}}));
    }
    const surface=createLeaderReturnSurface(config,layout);
    tops.push(surface);parts.push(surface);
    const support=createCostado({config,key:'return-support',depthMm:590,position:[layout.returnX,355,layout.returnEndZ],
      rotationY:Math.PI/2,leaderRole:'RETURN_END'});
    if(support.componentConfig.pedestal)parts.push(createLeaderPedestal(config,layout,support));
    else parts.push(support);
    parts.push(...createLeaderUnionPlates(config,layout));
  }
  for(const surface of tops){const grommet=createGrommet(surface);if(grommet)parts.push(grommet);parts.push(...createLeaderSurfaceAccessories(config,surface));}
  if(config.hasDuct) {
    const duct=createDucto({config,x:0,z:config.depthMm/2-70});
    if(duct)parts.push(duct,...createDuctAccessories(config,duct));
  }
  return {parts,layout:{surfaceDepthMm:config.depthMm,gapMm:0,totalDepthMm:config.depthMm,centersZMm:[0]},leader:true,
    bounds:{widthMm:layout.widthMm,depthMm:config.leaderCredenza?Math.max(config.depthMm,config.leaderCredenzaLengthMm):config.depthMm+config.returnLengthMm}};
}
