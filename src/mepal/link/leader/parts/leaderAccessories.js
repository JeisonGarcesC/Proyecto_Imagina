import { linkPart } from '../../parts/linkParts.js';
import { LINK_LEADER_ACCESSORIES } from '../rules/leaderAccessoryRules.js';
import { LINK_LEADER_PEDESTAL } from '../rules/leaderPedestalRules.js';
import { createFloorDuct } from '../../parts/ductos.js';
export function createLeaderSurfaceAccessories(config,surface) {
  const c=surface.componentConfig,result=[],hole=surface.grommetHole,angle=surface.rotationY;
  const localX=hole?.xMm||0,localZ=surface.dimensions[2]/2-70;
  const point=[surface.position[0]+localX*Math.cos(angle)+localZ*Math.sin(angle),0,
    surface.position[2]-localX*Math.sin(angle)+localZ*Math.cos(angle)];
  if(hole){
    const r=LINK_LEADER_ACCESSORIES.outletBox;
    result.push(linkPart('OUTLET_BOX',surface.key+'-outlet',r.dimensions,[point[0],670,point[2]],r.code,'LINK caja tomas para grommet',
      {rotationY:angle,model:{kind:'glb',src:r.modelSrc},parentComponentKey:surface.key,configTargetKey:surface.key,componentConfig:c,meta:{category:'cajas-tomas'}}));
  }
  if(c.floorDuct)result.push(createFloorDuct({config,key:surface.key+'-floor',targetKey:surface.key,position:point,component:c,rotationY:angle}));
  return result;
}
export function createLeaderUnionPlates(config,layout){
  const r=LINK_LEADER_ACCESSORIES.unionPlate;
  return [-95,95].map((offset,index)=>linkPart('UNION_PLATE','leader-union-'+index,r.dimensions,
    [layout.returnX+offset,705,-config.depthMm/2-5],r.code,'LINK lámina unión superficies',
    {model:{kind:'glb',src:r.modelSrc},meta:{category:'leader-supports',layoutType:'LEADER',leaderRole:'SURFACE_JUNCTION',unionPlateIndex:index}}));
}
export function createLeaderPedestal(config,layout,support){
  const r=LINK_LEADER_PEDESTAL;
  return linkPart('PEDESTAL','pedestal',[r.widthMm,r.heightMm,r.depthMm],
    [layout.returnX,r.heightMm/2,-config.depthMm/2-config.returnLengthMm+r.depthMm/2],r.code,
    'LINK pedestal de retorno · código por confirmar',{materialRole:'pedestal',materialBase:'FORMICA',model:{kind:'glb',src:r.modelSrc},
      provisional:true,componentConfig:support.componentConfig,configTargetKey:'return-support',meta:{category:'pedestales',layoutType:'LEADER'}});
}
