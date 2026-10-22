// Independent LINK placement data. Main surface + return surface (a full Link surface beside it) or credenza.
// Los costados se alinean al ras con el límite de la superficie (perfil de 50.8 mm).
export const LINK_LEADER_LEG_INSET_MM=60;
export function resolveLinkLeaderLayout(config) {
  // Medidas reales como en Koncisa Plus (sin sobrante). Solo con credenza se conserva el largo real de Link: nominal + 51 mm, salvo especial.
  const sign=config.side==='derecha'?1:-1, extra=config.leaderCredenza&&!config.modoEspecial?51:0, inset=LINK_LEADER_LEG_INSET_MM;
  const width=config.widthMm+extra, returnLength=config.returnLengthMm;
  // Igual que Koncisa Plus: el retorno sale del borde frontal (-Z) de la principal, en el extremo de la entrega, con su borde exterior al ras de la principal.
  return {sign,widthMm:width,returnLengthMm:returnLength,returnX:sign*(width-config.returnDepthMm)/2,returnZ:-(config.depthMm+returnLength)/2,
    returnRotation:sign*Math.PI/2,
    // Cada costado queda con soportes de viga hacia el interior del puesto y cara plana/exterior hacia fuera.
    freeX:-sign*(width/2-inset),freeRotation:-sign*Math.PI/2,junctionX:sign*(width/2-inset),junctionRotation:sign*Math.PI/2,
    returnEndZ:-(config.depthMm/2+returnLength-inset),returnEndRotation:Math.PI};
}

