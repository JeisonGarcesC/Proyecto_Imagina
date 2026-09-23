import { linkPart } from './linkParts.js';
import { resolveLinkGrommet } from '../rules/linkCableAccessRules.js';
export function createGrommet(surface) {
  if(!surface.grommetHole)return null;
  const h=surface.grommetHole,rotation=surface.rotationY,rule=resolveLinkGrommet({leader:!!surface.leaderRole,finish:surface.componentConfig.grommetFinish});
  return linkPart('GROMMET',surface.key.replace('surface','grommet'),[rule.widthMm,30,100],
    [surface.position[0]+h.xMm*Math.cos(rotation)+h.zMm*Math.sin(rotation),
      710+surface.dimensions[1]-15,surface.position[2]-h.xMm*Math.sin(rotation)+h.zMm*Math.cos(rotation)],
    rule.code,'LINK grommet '+surface.componentConfig.grommetFinish,
    {rotationY:rotation,moduleIndex:surface.moduleIndex,materialRole:'grommet',model:{kind:'glb',src:rule.modelSrc},
      componentConfig:surface.componentConfig,configTargetKey:surface.key,parentComponentKey:surface.key,
      meta:{category:'grommets',leaderRole:surface.leaderRole}});
}
