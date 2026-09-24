import { createSuperficie } from '../../parts/superficies.js';
export function createLeaderMainSurface(config,layout){
  return createSuperficie({config,key:'surface-0',widthMm:layout.widthMm,depthMm:config.depthMm,position:[0,0,0],leaderRole:'MAIN'});
}
export function createLeaderReturnSurface(config,layout){
  const effective={...config,cableAccess:config.leaderReturnGrommet?'grommet':'none'};
  return createSuperficie({config:effective,key:'return-surface',widthMm:config.returnLengthMm,depthMm:600,
    position:[layout.returnX,0,layout.returnZ],rotationY:layout.returnRotation,leaderRole:'RETURN'});
}

