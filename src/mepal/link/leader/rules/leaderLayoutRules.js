// Independent LINK placement data. Main surface + return surface (a full Link surface beside it) or credenza.
// Los costados se retiran 65 mm del borde de la superficie, como en el puesto Link estándar (centro a 90.4 mm del borde).
export const LINK_LEADER_LEG_INSET_MM=65+25.4;
export function resolveLinkLeaderLayout(config) {
  // Medidas reales como en el puesto Link estándar: nominal + 51 mm, salvo en puesto especial.
  const sign=config.side==='derecha'?1:-1, extra=config.modoEspecial?0:51, inset=LINK_LEADER_LEG_INSET_MM;
  const width=config.widthMm+extra, returnLength=config.returnLengthMm+extra;
  // El grommet y el ducto cableado están al frente (-Z): el retorno siempre va por detrás (+Z), sin tocar el ducto.
  return {sign,widthMm:width,returnLengthMm:returnLength,returnX:sign*(width-config.returnDepthMm)/2,returnZ:(config.depthMm+returnLength)/2,
    returnRotation:sign*Math.PI/2,
    // Cada costado queda con su cara interior (+Z local) hacia el interior del puesto.
    freeX:-sign*(width/2-inset),freeRotation:sign*Math.PI/2,junctionX:sign*(width/2-inset),junctionRotation:-sign*Math.PI/2,
    returnEndZ:config.depthMm/2+returnLength-inset,returnEndRotation:Math.PI};
}

