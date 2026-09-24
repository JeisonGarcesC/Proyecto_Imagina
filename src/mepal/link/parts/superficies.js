import { linkPart } from './linkParts.js';
import { linkComponentConfig } from '../rules/linkComponentRules.js';
import { resolveLinkSurface } from '../rules/linkSurfaceRules.js';
import { resolveLinkLeaderSurface } from '../leader/rules/leaderSurfaceRules.js';
import { resolveLinkGrommet } from '../rules/linkCableAccessRules.js';
export function createSuperficie({config,key,widthMm,depthMm,position,moduleIndex=0,rotationY=0,leaderRole=null}) {
  const component=linkComponentConfig(config,key,{finishId:config.finishId,grommet:config.cableAccess==='grommet',
    grommetFinish:config.grommetFinish,grommetPosition:'CENTER',floorDuct:false,floorSide:'CENTER'});
  const rule=leaderRole?resolveLinkLeaderSurface(config,component,leaderRole):resolveLinkSurface({...config,finishId:component.finishId});
  const grommet=resolveLinkGrommet({leader:!!leaderRole,finish:component.grommetFinish});
  const hole=component.grommet?{widthMm:grommet.widthMm,depthMm:100,zMm:depthMm/2-70,
    xMm:component.grommetPosition==='LEFT'?-(widthMm-grommet.widthMm)/2+80:component.grommetPosition==='RIGHT'?(widthMm-grommet.widthMm)/2-80:0}:null;
  return linkPart('SURFACE',key,[widthMm,rule.thickMm,depthMm],[position[0],710+rule.thickMm/2,position[2]],
    rule.code,'LINK superficie '+(leaderRole||config.surfaceMode)+' '+rule.label+' '+widthMm+' × '+depthMm+' mm',
    {moduleIndex,rotationY,materialBase:rule.materialBase,componentConfig:component,leaderRole,
      grommetHole:hole,meta:{category:'superficies',layoutType:leaderRole?'LEADER':'STANDARD',leaderRole}});
}

