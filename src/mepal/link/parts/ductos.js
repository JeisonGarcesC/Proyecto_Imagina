import { linkPart } from './linkParts.js';
import { linkComponentConfig } from '../rules/linkComponentRules.js';
import { resolveLinkDucto } from '../rules/linkDuctoRules.js';
import { resolveLinkFloorDuct } from '../rules/linkFloorDuctRules.js';
import { resolveLinkCeilingDuct } from '../rules/linkCeilingDuctRules.js';
import { resolveLinkDuctCover } from '../rules/linkDuctCoverRules.js';
import { resolveIntegracionHole, LINK_INTEGRACION_LENGTH_MM } from './superficies.js';

// Largo real del GLB del ducto cableado sencillo (LKSO150000_120cm), que se dibuja a tamaño exacto.
const LINK_DUCT_SENCILLO_GLB_WIDTH_MM = 1199;
// Puesto individual: bajantes de sección cuadrada (más delgados que el catálogo) para que quepan en el cuadrado del ducto.
const LINK_SENCILLO_BAJANTE_SECTION_MM = 70;
const LINK_BAJANTE_GAP_MM = 2;
// Abertura cuadrada con placa y orificio circular en cada extremo del GLB del ducto cableado sencillo (medida sobre el modelo):
// mide 80 × 71 mm y su centro queda a 541.5 mm del centro del ducto en X y 23.7 mm hacia +Z.
const LINK_DUCT_SENCILLO_PLATE_CENTER_X_MM = 541.5;
const LINK_DUCT_SENCILLO_PLATE_CENTER_Z_MM = 23.7;
// Un poco más grande que la abertura (80 × 71 mm) para que se vea más robusto.
const LINK_SENCILLO_FLOOR_FOOTPRINT_MM = [88, 79];
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
  const component=linkComponentConfig(config,key,{coverLeft:false,coverRight:false,floorDuct:false,floorSide:'RIGHT',ceilingSide:'NONE',supportFinish:'PINTADO',removed:false});
  if(component.removed)return null;
  const rule=resolveLinkDucto({...config,moduleIndex});
  return linkPart('DUCT',key,[rule.widthMm,rule.heightMm,rule.depthMm],[x+rule.offsetXMm,697-rule.heightMm/2,z],
    rule.code,'LINK ducto cableado '+(config.type==='doble'?'doble':'sencillo')+' intermedio',
    {moduleIndex,rotationY,materialBase:'METAL',model:{kind:'glb',src:rule.modelSrc,exactSize:config.type === 'sencillo'},componentConfig:component,
      meta:{category:'ductos',tipoModulo:'INTERMEDIO',tipoPuesto:config.type}});
}
export function createFloorDuct({config,key,targetKey,position,component,ductHeight,rotationY=0,invertFootprint=true,footprintMm=null}) {
  const rule=resolveLinkFloorDuct(config.type,component.supportFinish||'PINTADO');
  // Líder: se invierten widthMm y depthMm (lado gordo al frente). Estándar: huella según catálogo (ancho en X, profundidad en Z).
  const footprint=footprintMm||(invertFootprint?[rule.depthMm,rule.widthMm]:[rule.widthMm,rule.depthMm]);
  return linkPart('FLOOR_DUCT',key,[footprint[0],ductHeight,footprint[1]],[position[0],ductHeight/2,position[2]],rule.code,
    'LINK ducto bajante a piso '+(component.supportFinish||'PINTADO'),
    {rotationY,componentConfig:component,configTargetKey:targetKey,parentComponentKey:targetKey,meta:{category:'ductos-a-piso'}});
}
export function createDuctAccessories(config,duct) {
  if(!duct)return [];
  const c=duct.componentConfig,result=[],[w,h,d]=duct.dimensions;
  
  // Altura base del ducto para conectar los bajantes perfectamente
  const ductBottomY = duct.position[1] - h/2;

  if(c.floorDuct) {
    const ruleF=resolveLinkFloorDuct(config.type);
    // En LINK el bajante a piso solo va a izquierda o derecha (CENTER heredado se resuelve como derecha),
    // al ras del extremo real del ducto cableado, dentro del cuadrado de su boca.
    const ductHalfWidth=(config.type==='sencillo'?LINK_DUCT_SENCILLO_GLB_WIDTH_MM:w)/2;
    const sign=c.floorSide==='LEFT'?-1:1;
    if(config.type==='sencillo') {
      // Individual: bajante a piso encajado bajo la placa con el círculo del extremo del ducto cableado.
      result.push(createFloorDuct({
        config,key:duct.key+'-floor',targetKey:duct.key,
        position:[duct.position[0]+sign*LINK_DUCT_SENCILLO_PLATE_CENTER_X_MM,0,duct.position[2]+LINK_DUCT_SENCILLO_PLATE_CENTER_Z_MM],
        component:c, ductHeight: ductBottomY, footprintMm:LINK_SENCILLO_FLOOR_FOOTPRINT_MM
      }));
    } else if(config.type==='doble') {
      // Doble: una sola pieza que cubre los dos cuadrados del extremo (escalados como se dibuja el GLB).
      const sx=w/LINK_DUCT_DOBLE_GLB_WIDTH_MM, sz=d/LINK_DUCT_DOBLE_GLB_DEPTH_MM;
      result.push(createFloorDuct({
        config,key:duct.key+'-floor',targetKey:duct.key,
        position:[duct.position[0]+sign*LINK_DOBLE_SQUARE_CENTER_X_MM*sx,0,duct.position[2]],
        component:c, ductHeight: ductBottomY,
        footprintMm:[LINK_DOBLE_SQUARE_WIDTH_MM*sx+LINK_DOBLE_FLOOR_MARGIN_MM, LINK_DOBLE_SQUARES_Z_SPAN_MM*sz+LINK_DOBLE_FLOOR_MARGIN_MM]
      }));
    } else result.push(createFloorDuct({
      config,key:duct.key+'-floor',targetKey:duct.key,
      position:[duct.position[0]+sign*(ductHalfWidth-ruleF.widthMm/2),0,duct.position[2]],
      component:c, ductHeight: ductBottomY, invertFootprint:false
    }));
  }

  if(c.ceilingSide!=='NONE') {
    const r=resolveLinkCeilingDuct(config.type);
    // El bajante a techo va flotando literal al lado del ducto (afuera de la mesa)
    // Usamos r.depthMm en el eje X porque invertiremos las dimensiones para rotarlo
    let ceilingX = duct.position[0] + (c.ceilingSide === 'LEFT' ? -1 : 1) * (w/2 + r.depthMm/2 + 2);
    let ceilingZ = duct.position[2];
    let ceilingWidthMm = LINK_SENCILLO_BAJANTE_SECTION_MM;
    let ceilingDepthMm = LINK_SENCILLO_BAJANTE_SECTION_MM;
    // Con integración individual en ese extremo, el bajante a techo entra por el orificio de la integración.
    const pieceSide = c.ceilingSide === 'LEFT' ? 'izquierda' : 'derecha';
    const atEndModule = c.ceilingSide === 'LEFT' ? duct.moduleIndex === 0 : duct.moduleIndex === config.puestos - 1;
    const hasIntegration = config.type === 'sencillo' && config.integracionType === 'individual'
      && ['ambas', pieceSide].includes(config.integracionSide || 'derecha');
    if (hasIntegration && atEndModule) {
      const pieceX = (pieceSide === 'izquierda' ? -1 : 1) * (config.widthMm * config.puestos / 2 + LINK_INTEGRACION_LENGTH_MM / 2);
      const hole = resolveIntegracionHole(LINK_INTEGRACION_LENGTH_MM, config.depthMm, pieceSide === 'izquierda' ? 'derecha' : 'izquierda');
      // Pegado al borde del orificio más cercano a la mesa; el espacio sobrante queda hacia afuera.
      const towardTable = pieceSide === 'izquierda' ? 1 : -1;
      // Largo (eje X) como antes; el lado ancho (eje Z, el que mira al ducto cableado) igual al del orificio con 1 mm de holgura por lado.
      ceilingDepthMm = hole.depthMm - 2;
      ceilingX = pieceX + hole.xMm + towardTable * (hole.widthMm / 2 - ceilingWidthMm / 2 - 1);
      ceilingZ = hole.zMm;
    } else if (config.type === 'sencillo' && atEndModule) {
      // Sin integración: fuera del extremo de la mesa, nunca dentro de la pata.
      ceilingX = (pieceSide === 'izquierda' ? -1 : 1) * (config.widthMm * config.puestos / 2 + 25.5 + LINK_BAJANTE_GAP_MM + LINK_SENCILLO_BAJANTE_SECTION_MM / 2);
    }
    // Doble: mismas medidas que el bajante a piso doble y separado del extremo del ducto cableado (no pegado).
    if (config.type === 'doble') {
      const sx = w / LINK_DUCT_DOBLE_GLB_WIDTH_MM, sz = d / LINK_DUCT_DOBLE_GLB_DEPTH_MM;
      ceilingWidthMm = LINK_DOBLE_SQUARE_WIDTH_MM * sx + LINK_DOBLE_FLOOR_MARGIN_MM;
      ceilingDepthMm = LINK_DOBLE_SQUARES_Z_SPAN_MM * sz + LINK_DOBLE_FLOOR_MARGIN_MM;
      ceilingX = duct.position[0] + (c.ceilingSide === 'LEFT' ? -1 : 1) * (w / 2 + LINK_DOBLE_CEILING_DUCT_GAP_FROM_DUCT_END_MM + ceilingWidthMm / 2);
    }
    // Individual: sección cuadrada delgada. Doble: como el bajante a piso. Otros: se invierten r.widthMm y r.depthMm.
    const ceilingFootprint = config.type === 'sencillo' || config.type === 'doble'
      ? [ceilingWidthMm, ceilingDepthMm]
      : [r.depthMm, r.widthMm];
    result.push(linkPart('CEILING_DUCT',duct.key+'-ceiling',[ceilingFootprint[0],r.heightMm,ceilingFootprint[1]],[ceilingX,ductBottomY + r.heightMm/2,ceilingZ],r.code,
      'LINK ducto bajante a techo',{componentConfig:c,configTargetKey:duct.key,parentComponentKey:duct.key,meta:{category:'ductos-a-techo'}}));
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
