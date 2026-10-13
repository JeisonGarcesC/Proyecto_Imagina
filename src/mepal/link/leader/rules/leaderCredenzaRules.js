import { nominalCeilingClamped as nominalCeiling } from '../../rules/linkDimensionRules.js';
// La credenza que sustituye al retorno es la credenza Link Exe (modelo, lado y largo): ver linkCredenzaExeRules.js.
export const LINK_CREDENZA_SURFACE_CODES={600:{1500:'22000044163',1650:'22000044164',1800:'22000044165'},750:{1500:'22000044166',1650:'22000044167',1800:'22000044168'}};
export function resolveLinkCredenzaSurface(config) {
  return {code:LINK_CREDENZA_SURFACE_CODES[nominalCeiling(config.depthMm,[600,750])][nominalCeiling(config.widthMm,[1500,1650,1800])],
    thickMm:30,materialBase:'FORMICA',label:'Fórmica 30 mm · cableado a credenza'};
}
// Viga Link de refuerzo cableado a credenza: paralela a la principal, con la misma sección que la viga estándar (el conector visual va aparte).
export function resolveLinkCredenzaBeam(widthMm) {
  const nominal=nominalCeiling(widthMm,[1500,1650,1800]);
  return {code:{1500:'22000044169',1650:'22000044170',1800:'22000044171'}[nominal],widthMm:widthMm-130,heightMm:40,depthMm:80};
}
// Conector de cableado (GLB 2KSO382000): rellena el hueco entre la credenza y la superficie. Decorativo, sin BOM.
// Medidas del GLB: caja visible de 534 (X local) × 291 (Z local) × 91 mm y el bbox completo mide 534 × 91 × 679 mm (la caja queda en un extremo de Z).
// El conector solo ocupa el tramo del hueco: ancho (en el sentido de la mesa) 187 mm.
// El largo (a lo largo de la credenza) llega casi hasta los bordes de la superficie, hasta 641 mm, pero nunca los sobrepasa.
const CONNECTOR_BBOX_MM=[534,91,679],CONNECTOR_BOX_DEPTH_MM=291,CONNECTOR_MAX_LENGTH_MM=641,CONNECTOR_EDGE_MARGIN_MM=6;
// Hueco de cableado de la credenza Exe (medido en los GLB, igual en todos los modelos y largos): 555 x 85 mm en la parte superior,
// a 92-177 mm del panel posterior. La credenza va con su panel posterior al ras del extremo de la mesa, así que el hueco queda
// a 92-177 mm del extremo (centro a 134.5 mm) y centrado a lo largo de la superficie.
const CREDENZA_HOLE_CENTER_FROM_END_MM=134.5;
// El conector es una caja de 187 mm centrada en el hueco (cubre 92-177 mm con 45 mm de margen por lado), sin llegar al extremo de la mesa ni al otro extremo de la credenza.
const CONNECTOR_DEPTH_SCALE=187/CONNECTOR_BOX_DEPTH_MM;
export function resolveLinkCredenzaConnector(config){
  const lengthMm=Math.min(CONNECTOR_MAX_LENGTH_MM,config.depthMm-CONNECTOR_EDGE_MARGIN_MM);
  const axisScale=[lengthMm/CONNECTOR_BBOX_MM[0],1,CONNECTOR_DEPTH_SCALE];
  return {dimensions:CONNECTOR_BBOX_MM.map((v,i)=>v*axisScale[i]),axisScale,centerYMm:682,
    // Desplazamiento del centro de la caja visible respecto del centro del GLB (la caja queda en un extremo de Z local).
    boxOffsetMm:(CONNECTOR_BBOX_MM[2]-CONNECTOR_BOX_DEPTH_MM)/2*CONNECTOR_DEPTH_SCALE,
    modelSrc:'/assets/models/koncisaPlus/2KSO382000_VigaConectora.glb'};
}
// Centro (X) de la caja visible: el mismo del grommet y del hueco de la credenza, para que inicie y termine con el mismo margen a cada lado.
export function resolveLinkCredenzaConnectorCenterX(layout){return resolveLinkCredenzaGrommetCenterX(layout);}
// El grommet del modo credenza va justo sobre el hueco de la credenza, alineado con la mesa.
export function resolveLinkCredenzaGrommetCenterX(layout){return layout.sign*(layout.widthMm/2-CREDENZA_HOLE_CENTER_FROM_END_MM);}

