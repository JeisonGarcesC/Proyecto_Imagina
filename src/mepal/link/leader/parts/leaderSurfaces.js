import { createSuperficie } from '../../parts/superficies.js';
import { resolveLinkCredenzaGrommetCenterX } from '../rules/leaderCredenzaRules.js';
// La superficie principal es la misma superficie Link individual (120/150/180 y especial); solo con credenza usa la de cableado a credenza,
// con el grommet sobre la credenza (centrado en el conector de cableado), girado para quedar a lo largo del conector.
export function createLeaderMainSurface(config,layout){
  return createSuperficie({config,key:'surface-0',widthMm:layout.widthMm,depthMm:config.depthMm,position:[0,0,0],leaderRole:'MAIN',standardRule:!config.leaderCredenza,
    grommetPlacement:config.leaderCredenza?{xMm:resolveLinkCredenzaGrommetCenterX(layout),zMm:0}:null});
}
// El retorno es una superficie Link individual completa (mismo código y medidas que un puesto Link), colocada junto a la principal.
export function createLeaderReturnSurface(config,layout){
  const effective={...config,widthMm:config.returnLengthMm,depthMm:config.returnDepthMm,cableAccess:config.leaderReturnGrommet?'grommet':'none'};
  return createSuperficie({config:effective,key:'return-surface',widthMm:layout.returnLengthMm,depthMm:config.returnDepthMm,
    position:[layout.returnX,0,layout.returnZ],rotationY:layout.returnRotation,leaderRole:'RETURN',standardRule:true});
}

