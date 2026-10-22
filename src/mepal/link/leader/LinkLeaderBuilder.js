import { resolveLinkLeaderLayout } from './rules/leaderLayoutRules.js';
import { createLeaderMainSurface,createLeaderReturnSurface } from './parts/leaderSurfaces.js';
import { createLeaderMainBeam } from './parts/leaderBeams.js';
import { createLeaderCredenza,createLeaderCredenzaConnector } from './parts/leaderCredenzas.js';
import { createLeaderSurfaceAccessories,createLeaderUnionPlates,createLeaderPedestal } from './parts/leaderAccessories.js';
import { createCostado } from '../parts/costados.js';
import { createGrommet } from '../parts/grommets.js';
import { linkPart } from '../parts/linkParts.js';
import { resolveLeaderCostadoOutlet } from './rules/leaderCostadoOutletRules.js';
import { LINK_GROMMET_RULES } from '../rules/linkCableAccessRules.js';

export function buildLinkLeader(config) {
  const layout=resolveLinkLeaderLayout(config),parts=[];
  // El GLB del costado mide 600 mm de largo: se estira en proporción a la profundidad de la superficie que soporta.
  const mainScale=config.depthMm/600;
  const main=createLeaderMainSurface(config,layout);
  parts.push(main,createLeaderMainBeam(config,layout));
  parts.push(createCostado({config,key:'support-0',depthMm:config.depthMm,position:[layout.freeX,355,0],rotationY:layout.freeRotation,
    lengthScale:mainScale,leaderRole:'MAIN_FREE_END',hasTapa:false}));
  const tops=[main];
  if(config.leaderCredenza)parts.push(createLeaderCredenza(config,layout),createLeaderCredenzaConnector(config,layout));
  else {
    const junction=createCostado({config,key:'support-1',depthMm:config.depthMm,position:[layout.junctionX,355,0],rotationY:layout.junctionRotation,
      lengthScale:mainScale,leaderRole:'MAIN_RETURN_JUNCTION',hasTapa:false});
    if(junction.componentConfig.hasOutletBox){
      const rule=resolveLeaderCostadoOutlet(config.depthMm);
      if(rule?.code){
        junction.code=rule.code;
        junction.rawCodigoPT=rule.code;
        junction.logicalCode=rule.code;
        junction.description='LINK costado terminal sencillo con caja tomas';
        junction.name=junction.description;
      }
      parts.push(linkPart('OUTLET_BOX','junction-outlet',[80,80,200],[layout.junctionX-layout.sign*50,650,0],null,
        'Caja tomas incluida en costado LINK',{excludeFromBOM:true,model:{kind:'glb',src:rule.modelSrc},configTargetKey:junction.key,
          componentConfig:junction.componentConfig,meta:{category:'cajas-tomas'}}));
    }
    parts.push(junction);
    const surface=createLeaderReturnSurface(config,layout);
    tops.push(surface);parts.push(surface);
    const support=createCostado({config,key:'return-support',depthMm:config.returnDepthMm,ruleDepthMm:config.returnDepthMm,
      position:[layout.returnX,355,layout.returnEndZ],rotationY:layout.returnEndRotation,lengthScale:config.returnDepthMm/600,leaderRole:'RETURN_END',hasTapa:false});
    if(support.componentConfig.pedestal)parts.push(createLeaderPedestal(config,layout,support));
    else parts.push(support);
    parts.push(...createLeaderUnionPlates(config,layout));
  }
  // Con credenza no hay ducto intermedio: el cableado lo cubre el conector; el grommet (opcional) lleva su caja de tomas como en Koncisa.
  for(const surface of tops){const grommet=createGrommet(surface);if(grommet)parts.push(grommet);parts.push(...createLeaderSurfaceAccessories(config,surface));}
  // El puesto líder no lleva ducto cableado horizontal (como en Koncisa Plus): el cableado baja por el bajante a piso de cada grommet.
  // Con credenza el puesto factura el grommet 4 tomas (solo BOM, sin geometría); si ya hay un grommet 3D no se duplica.
  const bomExtras=[];
  if(config.leaderCredenza&&!parts.some(p=>p.role==='GROMMET'))
    bomExtras.push({code:LINK_GROMMET_RULES.standard[config.grommetFinish],description:'LINK grommet '+config.grommetFinish,quantity:1});
  return {parts,bomExtras,layout:{surfaceDepthMm:config.depthMm,gapMm:0,totalDepthMm:config.depthMm,centersZMm:[0]},leader:true,
    bounds:{widthMm:layout.widthMm,depthMm:config.leaderCredenza?Math.max(config.depthMm,config.credenzaLengthMm):config.depthMm+layout.returnLengthMm}};
}
