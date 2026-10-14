import { linkPart } from './linkParts.js';
import { linkComponentConfig } from '../rules/linkComponentRules.js';
import { resolveLinkSurface, resolveLinkSurfacePosition, resolveLinkIntegracionCode } from '../rules/linkSurfaceRules.js';
import { resolveLinkLeaderSurface } from '../leader/rules/leaderSurfaceRules.js';
import { resolveLinkGrommet } from '../rules/linkCableAccessRules.js';
export function createSuperficie({config,key,widthMm,depthMm,position,moduleIndex=0,rotationY=0,leaderRole=null,standardRule=false,grommetLeader=null,grommetPlacement=null,grommetOffset=null}) {
  const component=linkComponentConfig(config,key,{finishId:config.finishId,grommet:config.cableAccess==='grommet',
    grommetFinish:config.grommetFinish,grommetPosition:'CENTER',floorDuct:false,floorSide:'CENTER'});
  const rule=leaderRole&&!standardRule?resolveLinkLeaderSurface(config,component,leaderRole):resolveLinkSurface({...config,finishId:component.finishId},resolveLinkSurfacePosition(config,moduleIndex));
  // grommetLeader: grommet 4 tomas del líder (con credenza); por defecto sigue a la regla de superficie del líder.
  const leaderGrommet=grommetLeader??(!!leaderRole&&!standardRule);
  const grommet=resolveLinkGrommet({leader:leaderGrommet,finish:component.grommetFinish});
  // grommetPlacement (líder con credenza): el grommet va sobre la credenza, con su ranura girada 90° (largo en Z).
  const hole=component.grommet?(grommetPlacement
    ?{widthMm:100,depthMm:grommet.widthMm,xMm:grommetPlacement.xMm,zMm:grommetPlacement.zMm,rotationY:Math.PI/2}
    :{widthMm:grommet.widthMm,depthMm:100,
    // grommetOffset (retorno del líder): posición fija en ejes de la superficie, igual que en Koncisa Plus.
    zMm:grommetOffset?grommetOffset.zMm:-depthMm/2+70,
    xMm:grommetOffset?grommetOffset.xMm:component.grommetPosition==='LEFT'?-(widthMm-grommet.widthMm)/2+80:component.grommetPosition==='RIGHT'?(widthMm-grommet.widthMm)/2-80:0}):null;
  return linkPart('SURFACE',key,[widthMm,rule.thickMm,depthMm],[position[0],710+rule.thickMm/2,position[2]],
    rule.code,'Superficie principal',
    {moduleIndex,rotationY,materialBase:rule.materialBase,componentConfig:component,leaderRole,leaderGrommet,
      grommetHole:hole,accessoryAnchorMm:grommetPlacement||grommetOffset,meta:{category:'superficies',layoutType:leaderRole?'LEADER':'STANDARD',leaderRole}});
}
export const LINK_INTEGRACION_LENGTH_MM = 300;
export function resolveIntegracionHole(widthMm, depthMm, holeSide = 'derecha') {
  const edgeOffsetXMm = 53;
  // Separado del borde frontal para quedar en linea recta con la entrada (placa) del ducto cableado:
  // el ducto esta a 75 mm del frente y la placa a 23.7 mm de su eje, centro del orificio a 98.7 mm del frente.
  const holeCornerRadiusMm = 10;
  const holeWidthMm = 106;
  const holeDepthMm = 90;
  const edgeOffsetZMm = 75 + 23.7 - holeDepthMm / 2;
  const xSign = holeSide === 'izquierda' ? -1 : 1;
  return {
    widthMm: holeWidthMm,
    depthMm: holeDepthMm,
    cornerRadiusMm: holeCornerRadiusMm,
    xMm: xSign * (widthMm / 2 - edgeOffsetXMm - holeWidthMm / 2),
    zMm: -depthMm / 2 + edgeOffsetZMm + holeDepthMm / 2,
    side: holeSide,
  };
}
export function createSuperficieIntegracion({config, key, widthMm, depthMm, position, rotationY = 0, type, holeSide = null, side = null}) {
  // Solo la integración individual lleva orificio (entrada del ducto a techo).
  const integracionHole = type === 'individual' && holeSide ? resolveIntegracionHole(widthMm, depthMm, holeSide) : null;
  return linkPart('SURFACE', key, [widthMm, 30, depthMm], [position[0], 710 + 15, position[2]],
    resolveLinkIntegracionCode(config, type, side) || 'LINK_SUPERFICIE_INT', `Superficie de integración ${type}`,
    {rotationY, materialBase: 'FORMICA', meta: {category: 'superficies', integracionType: type}, integracionType: type, integracionHole, materialRole: 'surface'});
}
