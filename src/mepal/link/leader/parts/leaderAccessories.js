import { linkPart } from '../../parts/linkParts.js';
import { LINK_LEADER_ACCESSORIES } from '../rules/leaderAccessoryRules.js';
import { LINK_LEADER_PEDESTAL } from '../rules/leaderPedestalRules.js';
// Alturas (mm): la caja de tomas va pegada a la cara inferior de la superficie y el bajante sube hasta tocar la cara inferior de la caja.
const SURFACE_UNDERSIDE_MM=710;
export function createLeaderSurfaceAccessories(config,surface) {
  const c=surface.componentConfig,result=[],hole=surface.grommetHole,angle=surface.rotationY;
  // Bajante y caja de tomas van bajo el grommet; sin grommet, bajo el ancla de la superficie o al frente de la superficie.
  const anchor=hole||surface.accessoryAnchorMm;
  const localX=anchor?.xMm||0,localZ=anchor?.zMm??-surface.dimensions[2]/2+70;
  const point=[surface.position[0]+localX*Math.cos(angle)+localZ*Math.sin(angle),0,
    surface.position[2]-localX*Math.sin(angle)+localZ*Math.cos(angle)];
  // Todo grommet del líder lleva su caja de tomas, como en Koncisa Plus.
  let topY=SURFACE_UNDERSIDE_MM;
  if(hole&&surface.leaderRole){
    const r=LINK_LEADER_ACCESSORIES.outletBox,centerY=SURFACE_UNDERSIDE_MM-r.dimensions[1]/2;
    topY=centerY-r.dimensions[1]/2;
    result.push(linkPart('OUTLET_BOX',surface.key+'-outlet',r.dimensions,[point[0],centerY,point[2]],r.code,'LINK caja tomas para grommet',
      {rotationY:angle+(hole.rotationY||0),model:{kind:'glb',src:r.modelSrc},parentComponentKey:surface.key,configTargetKey:surface.key,componentConfig:c,meta:{category:'cajas-tomas'}}));
  }
  if(c.floorDuct){
    const r=LINK_LEADER_ACCESSORIES.floorDuct;
    result.push(linkPart('FLOOR_DUCT',surface.key+'-floor',[r.widthMm,topY,r.depthMm],[point[0],topY/2,point[2]],r.code,'LINK ducto bajante a piso',
      {rotationY:angle+(hole?.rotationY||0),model:{kind:'glb',src:r.modelSrc},componentConfig:c,configTargetKey:surface.key,parentComponentKey:surface.key,meta:{category:'ductos-a-piso'}}));
  }
  return result;
}
// Láminas de unión entre la principal y el retorno (2 por puesto, bajo ambas superficies), igual que en Koncisa Plus.
export function createLeaderUnionPlates(config,layout){
  const r=LINK_LEADER_ACCESSORIES.unionPlate;
  return [-95,95].map((offset,index)=>linkPart('UNION_PLATE','leader-union-'+index,r.dimensions,
    [layout.returnX+offset,705,-config.depthMm/2-5],r.code,'LINK lámina unión superficies',
    {model:{kind:'glb',src:r.modelSrc},meta:{category:'leader-supports',layoutType:'LEADER',leaderRole:'SURFACE_JUNCTION',unionPlateIndex:index}}));
}
export function createLeaderPedestal(config,layout,support){
  const r=LINK_LEADER_PEDESTAL;
  return linkPart('PEDESTAL','pedestal',[r.widthMm,r.heightMm,r.depthMm],
    [layout.returnX,r.heightMm/2,-(config.depthMm/2+layout.returnLengthMm-r.depthMm/2)],r.code,
    'LINK pedestal de retorno · código por confirmar',{materialRole:'pedestal',materialBase:'FORMICA',model:{kind:'glb',src:r.modelSrc},
      provisional:true,componentConfig:support.componentConfig,configTargetKey:'return-support',meta:{category:'pedestales',layoutType:'LEADER'}});
}
