import { resolveLinkSurfaceLayout } from '../rules/linkSurfaceRules.js';
import { createSuperficie } from '../parts/superficies.js';
import { createCostado } from '../parts/costados.js';
import { createViga } from '../parts/vigas.js';
import { createGrommet } from '../parts/grommets.js';
import { createDucto,createDuctAccessories } from '../parts/ductos.js';
export function buildLinkStandard(config){
  const c=config,parts=[],layout=resolveLinkSurfaceLayout(c);
  for(let moduleIndex=0;moduleIndex<c.puestos;moduleIndex++){
    const x=(moduleIndex-(c.puestos-1)/2)*c.widthMm;
    layout.centersZMm.forEach((z,index)=>{
      const suffix=moduleIndex===0?'':'-module-'+moduleIndex;
      const surface=createSuperficie({config:c,key:'surface-'+index+suffix,widthMm:c.widthMm,depthMm:layout.surfaceDepthMm,
        position:[x,0,z],moduleIndex,rotationY:index===1?Math.PI:0});
      parts.push(surface,createViga({key:'beam-'+index+suffix,widthMm:c.widthMm,position:[x,670,z],moduleIndex}));
      const grommet=createGrommet(surface);if(grommet)parts.push(grommet);
    });
    if(c.hasDuct){
      const duct=createDucto({config:c,moduleIndex,x,z:c.type==='doble'?0:layout.surfaceDepthMm/2-70});
      if(duct)parts.push(duct,...createDuctAccessories(c,duct));
    }
  }
  for(let index=0;index<=c.puestos;index++){
    const terminal=index===0||index===c.puestos;
    const x=-c.widthMm*c.puestos/2+index*c.widthMm+(index===0?65:index===c.puestos?-65:0);
    const depth=!terminal&&c.type==='doble'?c.depthMm*2-390:layout.totalDepthMm;
    parts.push(createCostado({config:c,key:'support-'+index,terminal,depthMm:depth,position:[x,355,0],moduleIndex:index}));
  }
  return {parts,layout,leader:false,bounds:{widthMm:c.widthMm*c.puestos,depthMm:layout.totalDepthMm}};
}

