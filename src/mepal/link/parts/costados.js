import { linkComponentConfig } from '../rules/linkComponentRules.js';
import { resolveLinkCostado } from '../rules/linkCostadoRules.js';
import { resolveLeaderCostadoOutlet } from '../leader/rules/leaderCostadoOutletRules.js';

export function createCostado({config,key,terminal=true,replaceZone=null,depthMm,position,moduleIndex=0,rotationY=0,leaderRole=null,lengthScale=1,integracion=false}) {
  const component=linkComponentConfig(config,key,{shape:config.tipoCostado,supportFinish:config.supportFinish,hasOutletBox:false,pedestal:false});
  const rule=resolveLinkCostado({type:config.type,depthMm:config.depthMm,terminal,shape:component.shape,supportFinish:component.supportFinish,integracion});
  if(leaderRole==='MAIN_RETURN_JUNCTION'&&component.hasOutletBox)rule.code=resolveLeaderCostadoOutlet(config.depthMm,component.shape,component.supportFinish).code;
  const subtype=terminal?'terminal':'intermedio';
  const description=`LINK costado ${integracion&&terminal?'integración':subtype} ${component.shape} ${component.supportFinish}`;
  const [x=0,y=0,z=0]=position || [];

  return {
    type:'costado',
    subtype,
    line:'LINK',
    role:'SUPPORT',
    key,
    code:rule.code,
    logicalCode:rule.code,
    existsInCatalog:!!rule.code,
    rawCodigoPT:rule.code,
    name:description,
    description,
    dimMm:{widthMm:50.8,heightMm:710,depthMm},
    position:{x,y,z},
    rotation:{x:0,y:rotationY,z:0},
    // El GLB solo existe a 60/120 cm; lengthScale lo estira a lo largo de la profundidad cuando el ancho no es 600 mm.
    model:{kind:'glb',src:rule.modelSrc,exactSize:true,...(lengthScale!==1?{lengthScale}:{})},
    materialRole:'structure',
    materialBase:'METAL',
    moduleIndex,
    shape:component.shape,
    supportFinish:component.supportFinish,
    provisional:!rule.code,
    componentConfig:component,
    leaderRole,
    meta:{
      category:'costados',
      tipo:subtype,
      tipoPuesto:config.type,
      integracion:integracion&&terminal,
      terminal,
      shape:component.shape,
      supportFinish:component.supportFinish,
      depthMm,
      moduleIndex,
      replaceZone,
      layoutType:leaderRole?'LEADER':'STANDARD',
      leaderRole,
      pedestalTarget:leaderRole==='RETURN_END',
    },
  };
}
