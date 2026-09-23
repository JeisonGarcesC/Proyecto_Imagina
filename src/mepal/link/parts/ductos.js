import { linkPart } from './linkParts.js';
import { linkComponentConfig } from '../rules/linkComponentRules.js';
import { resolveLinkDucto } from '../rules/linkDuctoRules.js';
import { resolveLinkFloorDuct } from '../rules/linkFloorDuctRules.js';
import { resolveLinkCeilingDuct } from '../rules/linkCeilingDuctRules.js';
import { resolveLinkDuctCover } from '../rules/linkDuctCoverRules.js';

export function createDucto({config,moduleIndex=0,x=0,z=0,key='duct-'+moduleIndex}) {
  const component=linkComponentConfig(config,key,{coverLeft:false,coverRight:false,floorDuct:false,floorSide:'CENTER',ceilingSide:'NONE',supportFinish:'PINTADO',removed:false});
  if(component.removed)return null;
  const rule=resolveLinkDucto({...config,moduleIndex});
  return linkPart('DUCT',key,[rule.widthMm,rule.heightMm,rule.depthMm],[x+rule.offsetXMm,675-rule.heightMm/2,z],
    rule.code,'LINK ducto cableado '+(config.type==='doble'?'doble':'sencillo')+' intermedio',
    {moduleIndex,materialBase:'METAL',model:{kind:'glb',src:rule.modelSrc},componentConfig:component,
      meta:{category:'ductos',tipoModulo:'INTERMEDIO',tipoPuesto:config.type}});
}
export function createFloorDuct({config,key,targetKey,position,component,rotationY=0}) {
  const rule=resolveLinkFloorDuct(config.type,component.supportFinish||'PINTADO');
  return linkPart('FLOOR_DUCT',key,[rule.widthMm,rule.heightMm,rule.depthMm],[position[0],rule.heightMm/2,position[2]],rule.code,
    'LINK ducto bajante a piso '+(component.supportFinish||'PINTADO'),
    {rotationY,model:{kind:'glb',src:rule.modelSrc},componentConfig:component,configTargetKey:targetKey,parentComponentKey:targetKey,meta:{category:'ductos-a-piso'}});
}
export function createDuctAccessories(config,duct) {
  if(!duct)return [];
  const c=duct.componentConfig,result=[],[w,h,d]=duct.dimensions;
  const sideX=side=>duct.position[0]+(side==='LEFT'?-1:side==='RIGHT'?1:0)*(w/2-110);
  if(c.floorDuct)result.push(createFloorDuct({config,key:duct.key+'-floor',targetKey:duct.key,position:[sideX(c.floorSide),0,duct.position[2]],component:c}));
  if(c.ceilingSide!=='NONE') {
    const r=resolveLinkCeilingDuct(config.type);
    result.push(linkPart('CEILING_DUCT',duct.key+'-ceiling',[r.widthMm,r.heightMm,r.depthMm],[sideX(c.ceilingSide),r.heightMm/2,duct.position[2]],r.code,
      'LINK ducto bajante a techo',{model:{kind:'glb',src:r.modelSrc},componentConfig:c,configTargetKey:duct.key,parentComponentKey:duct.key,meta:{category:'ductos-a-techo'}}));
  }
  for(const side of ['Left','Right'])if(c['cover'+side]) {
    const r=resolveLinkDuctCover(config.type);
    result.push(linkPart('DUCT_COVER',duct.key+'-cover-'+side.toLowerCase(),[r.widthMm,h,d],
      [duct.position[0]+(side==='Left'?-1:1)*(w+r.widthMm)/2,duct.position[1],duct.position[2]],r.code,
      'LINK tapa ducto '+(side==='Left'?'izquierda':'derecha')+' · código por confirmar',
      {model:{kind:'glb',src:r.modelSrc},provisional:true,componentConfig:c,configTargetKey:duct.key,parentComponentKey:duct.key,meta:{category:'tapas-ducto',side}}));
  }
  return result;
}
