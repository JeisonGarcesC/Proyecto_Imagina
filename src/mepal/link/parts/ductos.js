import { linkPart } from './linkParts.js';
import { linkComponentConfig } from '../rules/linkComponentRules.js';
import { resolveLinkDucto } from '../rules/linkDuctoRules.js';
import { resolveLinkFloorDuct } from '../rules/linkFloorDuctRules.js';
import { resolveLinkCeilingDuct } from '../rules/linkCeilingDuctRules.js';
import { resolveLinkDuctCover } from '../rules/linkDuctCoverRules.js';
import { resolveIntegracionHole, LINK_INTEGRACION_LENGTH_MM } from './superficies.js';

// Largo real del GLB del ducto cableado sencillo (LKSO150000_120cm), que se dibuja a tamaño exacto.
const LINK_DUCT_SENCILLO_GLB_WIDTH_MM = 1199;
// El GLB del ducto sencillo solo existe a 120 cm: se estira a lo largo (X) en proporción al largo real del puesto.
const LINK_DUCT_SENCILLO_BASE_WIDTH_MM = 1200;
const sencilloDuctLengthScale = (config) => config.type === 'sencillo' ? config.widthMm / LINK_DUCT_SENCILLO_BASE_WIDTH_MM : 1;
// Puesto individual: bajantes de sección cuadrada (más delgados que el catálogo) para que quepan en el cuadrado del ducto.
const LINK_SENCILLO_BAJANTE_SECTION_MM = 70;
const LINK_BAJANTE_GAP_MM = 2;
// Abertura cuadrada con placa y orificio circular en cada extremo del GLB del ducto cableado sencillo:
// mide 94 × 93 mm y su centro (con el orificio circular) queda a 553.0 mm en X y 23.2 mm en Z sobre el modelo.
const LINK_DUCT_SENCILLO_PLATE_CENTER_X_MM = 553.0;
const LINK_DUCT_SENCILLO_PLATE_CENTER_Z_MM = 23.2;
// Sección reducida de 70 × 70 mm para que encaje perfectamente dentro del cuadrado sin rozar la tapa del costado.
const LINK_SENCILLO_FLOOR_FOOTPRINT_MM = [LINK_SENCILLO_BAJANTE_SECTION_MM, LINK_SENCILLO_BAJANTE_SECTION_MM];
// Ducto cableado doble (LKSO140000_120cm): el GLB mide 1199 × 276 mm en planta y se escala a las dimensiones de la regla.
// En cada extremo hay dos cuadrados (uno por fila) de 73 × 80 mm cuyo centro queda a 538 mm del centro del ducto en X
// y que juntos abarcan 190.1 mm en Z (medidas sobre el modelo, antes de escalar).
const LINK_DUCT_DOBLE_GLB_WIDTH_MM = 1199;
const LINK_DUCT_DOBLE_GLB_DEPTH_MM = 276;
const LINK_DOBLE_SQUARE_CENTER_X_MM = 538;
const LINK_DOBLE_SQUARE_WIDTH_MM = 73;
const LINK_DOBLE_SQUARES_Z_SPAN_MM = 190.1;
const LINK_DOBLE_FLOOR_MARGIN_MM = 8;
// Doble: separación entre el extremo del ducto cableado y la cara cercana del bajante a techo
// (más corta que en el individual; estimada de la captura de referencia, ajustable).
const LINK_DOBLE_CEILING_DUCT_GAP_FROM_DUCT_END_MM = 20;

export function createDucto({config,moduleIndex=0,x=0,z=0,key='duct-'+moduleIndex,rotationY=0}) {
  const component=linkComponentConfig(config,key,{coverLeft:true,coverRight:true,floorDuct:false,floorSide:'RIGHT',ceilingSide:'NONE',supportFinish:'PINTADO',removed:false});
  if(component.removed)return null;
  const rule=resolveLinkDucto({...config,moduleIndex});
  const lengthScale=config.type === 'sencillo' ? rule.widthMm / LINK_DUCT_SENCILLO_GLB_WIDTH_MM : 1;
  const topY = config.type === 'doble' ? 710 : 697;
  return linkPart('DUCT',key,[rule.widthMm,rule.heightMm,rule.depthMm],[x+rule.offsetXMm,topY-rule.heightMm/2,z],
    rule.code,'LINK ducto cableado '+(config.type==='doble'?'doble':'sencillo')+' intermedio',
    {moduleIndex,rotationY,materialBase:'METAL',model:{kind:'glb',src:rule.modelSrc,exactSize:config.type === 'sencillo',...(lengthScale!==1?{lengthScale}:{})},componentConfig:component,
      meta:{category:'ductos',tipoModulo:'INTERMEDIO',tipoPuesto:config.type}});
}
export function createFloorDuct({config,key,targetKey,position,component,ductHeight,rotationY=0,invertFootprint=true,footprintMm=null}) {
  const rule=resolveLinkFloorDuct(config.type,component.supportFinish||'PINTADO');
  const footprint=footprintMm||(invertFootprint?[rule.depthMm,rule.widthMm]:[rule.widthMm,rule.depthMm]);
  const model = rule.modelSrc ? { kind: 'glb', src: rule.modelSrc, exactSize: true } : null;
  const posY = position[1] !== undefined && position[1] !== 0 ? position[1] : (rule.heightMm || ductHeight) / 2;
  return linkPart('FLOOR_DUCT',key,[footprint[0],rule.heightMm || ductHeight,footprint[1]],[position[0],posY,position[2]],rule.code,
    'LINK ducto bajante a piso '+(component.supportFinish||'PINTADO'),
    {rotationY,componentConfig:component,configTargetKey:targetKey,parentComponentKey:targetKey,model,meta:{category:'ductos-a-piso'}});
}
export function createDuctAccessories(config,duct) {
  if(!duct)return [];
  const c=duct.componentConfig,result=[],[w,h,d]=duct.dimensions;
  const sencilloScale=sencilloDuctLengthScale(config);
  
  // Altura base del ducto para conectar los bajantes perfectamente
  const ductBottomY = duct.position[1] - h/2;

  if(c.floorDuct) {
    const ruleF=resolveLinkFloorDuct(config.type);
    const ductHalfWidth=(config.type==='sencillo'?LINK_DUCT_SENCILLO_GLB_WIDTH_MM*sencilloScale:w)/2;
    const sign=c.floorSide==='LEFT'?-1:1;
    // Enterrar los 2 pines por debajo del 3D (28 mm bajo el piso) para que la base cuadrada/patas apoyen en el piso
    const floorDuctPosY = ruleF.heightMm / 2 - 28;
    const floorRotY = c.floorSide === 'LEFT' ? Math.PI / 2 : -Math.PI / 2;
    if(config.type==='sencillo') {
      // Individual: bajante a piso con la cara de perforaciones mirando hacia afuera
      const sx = w / LINK_DUCT_SENCILLO_GLB_WIDTH_MM;
      result.push(createFloorDuct({
        config,key:duct.key+'-floor',targetKey:duct.key,
        position:[duct.position[0]+sign*LINK_DUCT_SENCILLO_PLATE_CENTER_X_MM*sx, floorDuctPosY, duct.position[2]+LINK_DUCT_SENCILLO_PLATE_CENTER_Z_MM],
        component:c, ductHeight: ruleF.heightMm, footprintMm:[100, 104], rotationY: floorRotY
      }));
    } else if(config.type==='doble') {
      // Doble: bajante a piso con la cara de perforaciones mirando hacia afuera
      const sx=w/LINK_DUCT_DOBLE_GLB_WIDTH_MM;
      result.push(createFloorDuct({
        config,key:duct.key+'-floor',targetKey:duct.key,
        position:[duct.position[0]+sign*LINK_DOBLE_SQUARE_CENTER_X_MM*sx, floorDuctPosY, duct.position[2]],
        component:c, ductHeight: ruleF.heightMm,
        footprintMm:[216, 100], rotationY: floorRotY
      }));
    } else result.push(createFloorDuct({
      config,key:duct.key+'-floor',targetKey:duct.key,
      position:[duct.position[0]+sign*(ductHalfWidth-ruleF.widthMm/2), floorDuctPosY, duct.position[2]],
      component:c, ductHeight: ruleF.heightMm, invertFootprint:false, rotationY: floorRotY
    }));
  }

  if(c.ceilingSide!=='NONE') {
    const r=resolveLinkCeilingDuct(config.type);
    const sign=c.ceilingSide==='LEFT'?-1:1;
    const moduleHalfWidth = config.widthMm / 2;
    const surfaceHalfWidth = (config.widthMm * config.puestos) / 2;
    // Doble: clearance de 45 mm para que el poste cuadrado quede completamente libre de la superficie y apoyen las placas soporte.
    const clearance = config.type === 'doble' ? 45 : 24;
    // Posicionado relativo al módulo seleccionado (igual que el ducto a piso), para que al poner 2 mesas juntas quede en el medio o en el extremo según la mesa
    let ceilingX = duct.position[0] + sign * (moduleHalfWidth + clearance);
    // Doble: bajado 26 mm para que las placas soporte queden perfectamente alineadas con la cara inferior de la superficie.
    // Sencillo: bajado 33 mm para alinear collarín y tornillos según lo ajustado.
    let ceilingY = ductBottomY + r.heightMm / 2 - (config.type === 'doble' ? 26 : 33);
    let ceilingZ = duct.position[2] + (config.type === 'sencillo' ? LINK_DUCT_SENCILLO_PLATE_CENTER_Z_MM : 0);
    let ceilingFootprint = [r.widthMm, r.depthMm];
    const rotY = c.ceilingSide === 'LEFT' ? Math.PI / 2 : -Math.PI / 2;

    // Con integración individual en ese extremo, el bajante a techo entra por el orificio de la integración.
    const pieceSide = c.ceilingSide === 'LEFT' ? 'izquierda' : 'derecha';
    const atEndModule = c.ceilingSide === 'LEFT' ? duct.moduleIndex === 0 : duct.moduleIndex === config.puestos - 1;
    const intSide = config.integracionSide || (config.integracionType === 'individual' ? 'derecha' : 'ambas');
    const sideHasIntegration = intSide === 'ambas' || intSide === 'ambos' || intSide === pieceSide;
    const hasIntegration = config.type === 'sencillo' && config.integracionType === 'individual' && sideHasIntegration;
    if (hasIntegration && atEndModule) {
      const pieceX = (pieceSide === 'izquierda' ? -1 : 1) * (surfaceHalfWidth + LINK_INTEGRACION_LENGTH_MM / 2);
      const hole = resolveIntegracionHole(LINK_INTEGRACION_LENGTH_MM, config.depthMm, pieceSide === 'izquierda' ? 'derecha' : 'izquierda');
      // Desplazado hacia el costado de modo que la placa en L quede pegada al costado
      ceilingX = pieceX + hole.xMm - sign * 20;
      ceilingZ = hole.zMm;
    }
    const model = r.modelSrc ? { kind: 'glb', src: r.modelSrc, exactSize: true } : null;
    result.push(linkPart('CEILING_DUCT',duct.key+'-ceiling',[ceilingFootprint[0],r.heightMm,ceilingFootprint[1]],[ceilingX,ceilingY,ceilingZ],r.code,
      'LINK ducto bajante a techo',{rotationY:rotY,model,componentConfig:c,configTargetKey:duct.key,parentComponentKey:duct.key,meta:{category:'ductos-a-techo'}}));
  }
  for(const side of ['Left','Right'])if(c['cover'+side]) {
    const r=resolveLinkDuctCover(config.type);
    result.push(linkPart('DUCT_COVER',duct.key+'-cover-'+side.toLowerCase(),[r.widthMm,h,d],
      [duct.position[0]+(side==='Left'?-1:1)*(w+r.widthMm)/2,duct.position[1],duct.position[2]],r.code,
      'LINK tapa ducto '+(side==='Left'?'izquierda':'derecha'),
      {excludeFrom3D:true,excludeFromBOM:true,provisional:false,componentConfig:c,configTargetKey:duct.key,parentComponentKey:duct.key,meta:{category:'tapas-ducto',side,excludeFromBOM:true}}));
  }
  return result;
}
