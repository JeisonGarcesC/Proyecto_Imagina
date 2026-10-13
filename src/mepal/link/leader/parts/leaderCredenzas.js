import { createCredenzaExe } from '../../parts/credenzasExe.js';
import { linkPart } from '../../parts/linkParts.js';
import { resolveLinkCredenzaConnector,resolveLinkCredenzaConnectorCenterX } from '../rules/leaderCredenzaRules.js';
// Credenza Link Exe en lugar del retorno: mismo GLB, código y descripción que la credenza independiente.
// Va contra el extremo de la superficie principal, por detrás del grommet como el retorno: borde frontal alineado y frente hacia el interior del puesto (GLB con frente en +Z).
export function createLeaderCredenza(config,layout) {
  const credenza=createCredenzaExe(config),[lengthMm,heightMm,depthMm]=credenza.dimensions,rotationY=-layout.sign*Math.PI/2;
  return {...credenza,key:'leader-credenza',
    position:[layout.sign*(layout.widthMm/2-depthMm/2),heightMm/2,-config.depthMm/2+lengthMm/2],
    rotationY,rotation:{x:0,y:rotationY,z:0},
    meta:{...credenza.meta,category:'leader-credenzas',layoutType:'LEADER',leaderRole:'CREDENZA'}};
}
// Conector de cableado, como el de Koncisa Plus: sobre el extremo de la credenza, centrado en la profundidad de la superficie y al ras del extremo de la mesa.
// Rota igual que la credenza; su GLB no se estira de forma uniforme (escala por eje) y no suma al BOM.
export function createLeaderCredenzaConnector(config,layout) {
  const r=resolveLinkCredenzaConnector(config),rotationY=-layout.sign*Math.PI/2;
  // La caja visible queda en un extremo del GLB: el centro del modelo se corrige hacia el interior de la mesa para dejar la caja al ras.
  return linkPart('STRUCTURE','leader-credenza-connector',r.dimensions,[resolveLinkCredenzaConnectorCenterX(layout)-layout.sign*r.boxOffsetMm,r.centerYMm,0],null,
    'LINK conector de cableado a credenza',{rotationY,excludeFromBOM:true,model:{kind:'glb',src:r.modelSrc,exactSize:true,axisScale:r.axisScale},
      meta:{category:'leader-beam-components',layoutType:'LEADER',leaderRole:'CREDENZA_CONNECTOR',decorative:true}});
}
