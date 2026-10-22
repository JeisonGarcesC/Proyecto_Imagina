// Reglas de catálogo oficiales para superficies 120°, costados 240° y soportes 360°.
// Fuente: LinkMapadelproducto.pdf, p. 7 y p. 23.

export const LINK_120_SURFACE_CODES = {
  600: {
    derecha: '22000009077',   // LKSU030010 120 x 60 DERECHA
    izquierda: '22000009076', // LKSU030010 120 x 60 IZQUIERDA
  },
  750: {
    derecha: '22000009087',   // LKSU030030 120 x 75 DERECHA
    izquierda: '22000009078', // LKSU030030 120 x 75 IZQUIERDA
  },
};

export const LINK_120_SUPPORTS = {
  soporte360: {
    code: '22000011409',
    logicalCode: 'LKSO110000',
    description: 'SOPORTE 360° LINK',
    dimensions: [360, 710, 310],
    modelSrc: '/assets/models/Link/LKSO110000_C360G.glb',
  },
  soporte240: {
    code: '22000129157',
    logicalCode: 'ELSO740000',
    description: 'SOPORTE 240° LINK',
    dimensions: [350, 710, 120],
    modelSrc: '/assets/models/Link/ELSO740000_C120G.glb',
  },
  costadoSencillo: {
    600: { code: '22000032441', description: 'Costado terminal sencillo 60 cm' },
    750: { code: '22000032442', description: 'Costado terminal sencillo 75 cm' },
  },
  costadoDoble: {
    1200: { code: '22000032435', description: 'Costado doble terminal 120 cm' },
    1500: { code: '22000032436', description: 'Costado doble terminal 150 cm' },
  },
  ductoDoble: {
    1200: { code: '22000021976', description: 'DUCTO CABLEADO DOBLE 120CM' },
  },
  grommet: {
    code: '22000023626',
    description: 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
  },
};

export function resolveLink120SurfaceCode(depthMm = 600, side = 'derecha') {
  const depth = depthMm >= 700 ? 750 : 600;
  const s = side === 'izquierda' ? 'izquierda' : 'derecha';
  return LINK_120_SURFACE_CODES[depth]?.[s] || LINK_120_SURFACE_CODES[600].derecha;
}

/**
 * Calcula puntos clave y orientaciones para los costados de las alas a 120°
 */
export function getLink120WingLayout(depthMm = 600, side = 'derecha', gap = 0, L = 1297, L_wing = 1296) {
  const isDerecha = side === 'derecha';
  const halfGap = gap / 2;
  const zSpine = isDerecha ? halfGap : -halfGap;
  const zFront = isDerecha ? (halfGap + depthMm) : -(halfGap + depthMm);
  const signZ = isDerecha ? 1 : -1;
  const cos60 = 0.5;
  const sin60 = Math.sqrt(3) / 2;
  const tan30 = 1 / Math.sqrt(3);

  const vWing = [cos60, signZ * sin60];
  const vPerp = [-sin60, signZ * cos60];

  const pApex = [L, zSpine];
  const pWingInner = [pApex[0] + L_wing * vWing[0], pApex[1] + L_wing * vWing[1]];
  const pWingOuter = [pWingInner[0] + depthMm * vPerp[0], pWingInner[1] + depthMm * vPerp[1]];
  const wingMidpoint = [(pWingInner[0] + pWingOuter[0]) / 2, (pWingInner[1] + pWingOuter[1]) / 2];
  const wingAngle = isDerecha ? (Math.PI / 6) : (5 * Math.PI / 6);
  const xCorner = L - depthMm * tan30;

  return {
    pApex,
    pWingInner,
    pWingOuter,
    wingMidpoint,
    wingAngle,
    xCorner,
    zFront,
    zSpine,
    signZ,
    L,
    L_wing,
  };
}
