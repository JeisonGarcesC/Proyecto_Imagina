import { createSuperficie } from '../../parts/superficies.js';
import { resolveLinkCredenzaGrommetCenterX } from '../rules/leaderCredenzaRules.js';
// La superficie principal usa las medidas y códigos de la principal del líder (1500/1650/1800 × 600/750); con credenza es la de cableado a credenza.
// Su grommet va siempre en el mismo sitio que con credenza: al final del lado largo, a 134.5 mm del extremo de la entrega,
// centrado a lo ancho y con la ranura cruzando el fondo.
export function createLeaderMainSurface(config,layout){
  return createSuperficie({config,key:'surface-0',widthMm:layout.widthMm,depthMm:config.depthMm,position:[0,0,0],leaderRole:'MAIN',grommetLeader:true,
    grommetPlacement:{xMm:resolveLinkCredenzaGrommetCenterX(layout),zMm:0}});
}
// El retorno es la superficie de retorno del líder (900/1000 × 600, como en Koncisa Plus), colocada al frente de la principal.
// Su grommet queda donde lo pone Koncisa Plus (respecto al centro, en ejes de la superficie):
// 158 mm hacia la principal a lo largo del retorno y a 120 mm del borde exterior a lo ancho (local +Z queda hacia afuera del puesto).
const RETURN_GROMMET_TOWARD_MAIN_MM=158,RETURN_GROMMET_OUTER_EDGE_MM=120;
export function createLeaderReturnSurface(config,layout){
  const effective={...config,widthMm:config.returnLengthMm,depthMm:config.returnDepthMm,cableAccess:config.leaderReturnGrommet?'grommet':'none'};
  return createSuperficie({config:effective,key:'return-surface',widthMm:layout.returnLengthMm,depthMm:config.returnDepthMm,
    position:[layout.returnX,0,layout.returnZ],rotationY:layout.returnRotation,leaderRole:'RETURN',grommetLeader:true,
    grommetOffset:{xMm:-layout.sign*RETURN_GROMMET_TOWARD_MAIN_MM,zMm:config.returnDepthMm/2-RETURN_GROMMET_OUTER_EDGE_MM}});
}

