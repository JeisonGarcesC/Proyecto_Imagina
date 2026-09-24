// Independent LINK placement data. Same main/junction/return decomposition as Koncisa.
export function resolveLinkLeaderLayout(config) {
  const sign=config.side==='derecha'?1:-1, width=config.widthMm+(config.leaderCredenza?50:0);
  return {sign,widthMm:width,returnX:sign*(width-600)/2,returnZ:-(config.depthMm+config.returnLengthMm)/2,
    returnRotation:sign*Math.PI/2,freeX:-sign*(width/2-25.4),junctionX:sign*(width/2-25.4),
    returnEndZ:-config.depthMm/2-config.returnLengthMm+25.4};
}

