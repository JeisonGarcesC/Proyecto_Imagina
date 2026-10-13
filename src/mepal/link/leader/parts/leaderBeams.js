import { linkPart } from '../../parts/linkParts.js';
import { resolveLinkViga } from '../../rules/linkVigaRules.js';
import { resolveLinkLeaderBeam } from '../rules/leaderBeamRules.js';
import { resolveLinkCredenzaBeam } from '../rules/leaderCredenzaRules.js';
const MAIN_BEAM_DEPTH_MM=80;
// Viga Link del retorno: misma viga que la de la superficie principal, pero más larga. Va por el centro de la superficie de retorno,
// Va por el centro de la superficie de retorno, desde el costado del extremo (donde apoya la viga) hasta tocar la cara posterior de la viga principal.
export function createLeaderReturnBeam(config,layout){
  const startZ=layout.returnEndZ,endZ=MAIN_BEAM_DEPTH_MM/2,lengthMm=startZ-endZ;
  // resolveLinkViga descuenta 130 mm al largo nominal del puesto: se pide largo + 130 para obtener esta longitud real y su código.
  const rule=resolveLinkViga(lengthMm+130);
  return linkPart('STRUCTURE','return-beam',[rule.widthMm,rule.heightMm,rule.depthMm],[layout.returnX,710-rule.heightMm/2,(startZ+endZ)/2],rule.code,
    'LINK viga refuerzo nominal '+rule.nominalWidthMm+' mm · retorno',{rotationY:Math.PI/2,meta:{category:'vigas',layoutType:'LEADER',leaderRole:'RETURN_BEAM'}});
}
export function createLeaderMainBeam(config){
  const rule=config.leaderCredenza?resolveLinkCredenzaBeam(config.widthMm):resolveLinkLeaderBeam(config);
  return linkPart('STRUCTURE','beam-0',[rule.widthMm,rule.heightMm,rule.depthMm],[0,710-rule.heightMm/2,0],rule.code,
    'LINK viga principal líder',{model:{kind:'glb',src:rule.modelSrc},meta:{category:'vigas',layoutType:'LEADER',leaderRole:'MAIN'}});
}
