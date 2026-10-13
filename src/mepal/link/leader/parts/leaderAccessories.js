import { linkPart } from '../../parts/linkParts.js';
import { LINK_LEADER_ACCESSORIES } from '../rules/leaderAccessoryRules.js';
import { LINK_LEADER_PEDESTAL } from '../rules/leaderPedestalRules.js';
import { createFloorDuct } from '../../parts/ductos.js';
export function createLeaderSurfaceAccessories(config,surface) {
  const c=surface.componentConfig,result=[],hole=surface.grommetHole,angle=surface.rotationY;
  const localX=hole?.xMm||0,localZ=hole?.zMm??-surface.dimensions[2]/2+70;
  const point=[surface.position[0]+localX*Math.cos(angle)+localZ*Math.sin(angle),0,
    surface.position[2]-localX*Math.sin(angle)+localZ*Math.cos(angle)];
  // La caja de 3 tomas solo acompaña al grommet del líder con credenza; el grommet Link estándar no la lleva.
  if(hole&&surface.leaderGrommet){
    const r=LINK_LEADER_ACCESSORIES.outletBox;
    result.push(linkPart('OUTLET_BOX',surface.key+'-outlet',r.dimensions,[point[0],670,point[2]],r.code,'LINK caja tomas para grommet',
      {rotationY:angle+(hole.rotationY||0),model:{kind:'glb',src:r.modelSrc},parentComponentKey:surface.key,configTargetKey:surface.key,componentConfig:c,meta:{category:'cajas-tomas'}}));
  }
  if(c.floorDuct)result.push(createFloorDuct({config,key:surface.key+'-floor',targetKey:surface.key,position:point,component:c,rotationY:angle}));
  return result;
}
export function createLeaderPedestal(config,layout,support){
  const r=LINK_LEADER_PEDESTAL;
  return linkPart('PEDESTAL','pedestal',[r.widthMm,r.heightMm,r.depthMm],
    [layout.returnX,r.heightMm/2,config.depthMm/2+layout.returnLengthMm-r.depthMm/2],r.code,
    'LINK pedestal de retorno · código por confirmar',{materialRole:'pedestal',materialBase:'FORMICA',model:{kind:'glb',src:r.modelSrc},
      provisional:true,componentConfig:support.componentConfig,configTargetKey:'return-support',meta:{category:'pedestales',layoutType:'LEADER'}});
}
