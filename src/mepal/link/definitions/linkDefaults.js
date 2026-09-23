export const LINK_DEFAULT_CONFIG = Object.freeze({
  puestos: 1, modoEspecial: false, finishId: 'FORMICA_30', tipoCostado: 'RECT',
  hasDuct: false, supportFinish: 'PINTADO', cableAccess: 'none', grommetFinish: 'ALUMINIUM', finishAssignments: {}, components: {}, componentTransforms: {},
  type: 'sencillo', widthMm: 1200, depthMm: 600, surfaceMode: 'principal',
  returnLengthMm: 900, side: 'derecha', leaderReturnGrommet: false,
  leaderCredenza: false, leaderCredenzaLengthMm: 1200,
  surfaceColor: '#d8c4a5', structureColor: '#444b52', pedestalColor: '#d8c4a5',
});

// Technical sheet p. 1 and product map pp. 5–8. Detailing is schematic.
export const LINK_DIMENSIONS = Object.freeze({
  supportHeightMm: 710, surfaceThicknessMm: 30, tubeMm: 50.8,
  principalGapMm: 26, plenaExtraDepthMm: 13,
  beamInsetMm: 130, beamSectionMm: 80, returnDepthMm: 600,
});

// No pedestal dimensions/SKU were identified in the supplied Link leader pages.
// Isolated visual placeholder, never billed as a confirmed commercial component.
export const LINK_PEDESTAL_PREVIEW = Object.freeze({ widthMm: 400, depthMm: 500, heightMm: 710 });
