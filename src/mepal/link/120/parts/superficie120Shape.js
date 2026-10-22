import { Shape, Path } from 'three';

/**
 * Genera el Shape 2D oficial para una superficie LINK de 120° (LKSU030010 / LKSU030030)
 * según el plano y catálogo oficial Link:
 * - Profundidad de cada brazo D = 600 mm (o 750 mm)
 * - Largo exterior espina/brazo izquierdo: 1.297 m (1297 mm)
 * - Largo exterior ala/brazo derecho: 1.296 m (1296 mm)
 * - Orificios para grommet de aluminio en shape.holes con la separación idéntica de mesa doble Link (166 mm centro a centro)
 * - Acuerdo curvo circular exacto (fillet) en el vértice interior donde se sienta el usuario
 */
export function createLink120SurfaceShape({
  L = 1297,
  L_wing = 1296,
  D = 600,
  side = 'derecha',
  hasGrommet = true,
  grommetSide = 'izquierda',
  cornerR = 130,
  gap = 0,
} = {}) {
  const shape = new Shape();
  const halfGap = gap / 2;
  const isDerecha = side === 'derecha';

  // Mapeo de coordenadas físicas (X, Z) a Shape Three.js:
  // ExtrudeGeometry con rotateX(-PI/2) produce:
  // mesh.X = shape.x
  // mesh.Z = -shape.y
  // Para cualquier punto físico (X, Z), el punto en el Shape es: (X, -Z).
  const pt = (x, z) => [x, -z];

  const zSpine = isDerecha ? halfGap : -halfGap;
  const zFront = isDerecha ? (halfGap + D) : -(halfGap + D);
  const signZ = isDerecha ? 1 : -1;

  const cos60 = 0.5;
  const sin60 = Math.sqrt(3) / 2;
  const tan30 = 1 / Math.sqrt(3);

  const vWing = [cos60, signZ * sin60];
  const vPerp = [-sin60, signZ * cos60];

  const notchWidth = 510;
  const notchDepth = 100;
  // Distancia del centro del grommet al borde de la espina/exterior:
  // En mesa doble (gap = 26): halfGap (13) + 70 = 83 mm (separación estándar 166 mm centro a centro).
  // En mesa individual (gap = 0): halfGap (0) + 70 = 70 mm (separación estándar Link 70 mm del borde).
  const grommetDist = halfGap + 70;

  // 1. Origen en la costura base en la espina
  shape.moveTo(...pt(0, zSpine));

  // 2. Espina central / brazo izquierdo recto continuo
  const pApex = [L, zSpine];
  shape.lineTo(...pt(...pApex));

  // Orificio en la espina (centrado en X=600 mm, Z=signZ * grommetDist)
  const hasGrommetSpine = hasGrommet && (grommetSide === 'izquierda' || grommetSide === 'ambos');
  if (hasGrommetSpine) {
    const hole = new Path();
    const hx = 600;
    const hz = signZ * grommetDist;
    const hw = notchWidth / 2;
    const hd = notchDepth / 2;
    const sx = hx;
    const sy = -hz;
    hole.moveTo(sx - hw, sy - hd);
    hole.lineTo(sx - hw, sy + hd);
    hole.lineTo(sx + hw, sy + hd);
    hole.lineTo(sx + hw, sy - hd);
    hole.closePath();
    shape.holes.push(hole);
  }

  // 3. Extremo exterior del ala
  const pWingInner = [
    pApex[0] + L_wing * vWing[0],
    pApex[1] + L_wing * vWing[1],
  ];
  shape.lineTo(...pt(...pWingInner));

  // Orificio en el ala a 60°
  const hasGrommetWing = hasGrommet && (grommetSide === 'derecha' || grommetSide === 'ambos');
  if (hasGrommetWing) {
    const holeW = new Path();
    const cPhysX = pApex[0] + 600 * vWing[0] + grommetDist * vPerp[0];
    const cPhysZ = pApex[1] + 600 * vWing[1] + grommetDist * vPerp[1];
    const scX = cPhysX;
    const scY = -cPhysZ;
    const uW = [vWing[0], -vWing[1]];
    const uH = [vPerp[0], -vPerp[1]];
    const hw = notchWidth / 2;
    const hd = notchDepth / 2;
    holeW.moveTo(scX - hw * uW[0] - hd * uH[0], scY - hw * uW[1] - hd * uH[1]);
    holeW.lineTo(scX - hw * uW[0] + hd * uH[0], scY - hw * uW[1] + hd * uH[1]);
    holeW.lineTo(scX + hw * uW[0] + hd * uH[0], scY + hw * uW[1] + hd * uH[1]);
    holeW.lineTo(scX + hw * uW[0] - hd * uH[0], scY + hw * uW[1] - hd * uH[1]);
    holeW.closePath();
    shape.holes.push(holeW);
  }

  // 5. Extremo exterior del ala (corte perpendicular de ancho D = 600 mm)
  const pWingOuter = [
    pWingInner[0] + D * vPerp[0],
    pWingInner[1] + D * vPerp[1],
  ];
  shape.lineTo(...pt(...pWingOuter));

  // 6. Esquina interior frontal del usuario con acuerdo circular exacto R
  const xCorner = L - D * tan30;
  const R = Math.min(Math.max(cornerR, 5), 200);
  const T = R / Math.sqrt(3);
  const d = R / sin60;

  const bisectorAir = [-0.5, signZ * sin60];
  const cX = xCorner + d * bisectorAir[0];
  const cZ = zFront + d * bisectorAir[1];

  const pTouch2 = [xCorner + T * vWing[0], zFront + T * vWing[1]];
  const pTouch1 = [xCorner - T, zFront];

  shape.lineTo(...pt(...pTouch2));

  // Arco circular tangencial exacto
  const sCenter = [cX, -cZ];
  const sT2 = [pTouch2[0], -pTouch2[1]];
  const sT1 = [pTouch1[0], -pTouch1[1]];
  const a2 = Math.atan2(sT2[1] - sCenter[1], sT2[0] - sCenter[0]);
  const a1 = Math.atan2(sT1[1] - sCenter[1], sT1[0] - sCenter[0]);

  shape.absarc(sCenter[0], sCenter[1], R, a2, a1, isDerecha ? false : true);

  // 7. Borde frontal recto hasta la base
  const pBaseFront = [0, zFront];
  shape.lineTo(...pt(...pBaseFront));

  // 8. Cierre en la costura base x = 0
  shape.closePath();

  const wingMidpoint = [
    (pWingInner[0] + pWingOuter[0]) / 2,
    (pWingInner[1] + pWingOuter[1]) / 2,
  ];

  return {
    shape,
    pApex,
    pWingInner,
    pWingOuter,
    wingMidpoint,
    wingAngle: isDerecha ? (Math.PI / 6) : (5 * Math.PI / 6),
    xCorner,
    L,
    L_wing,
    D,
  };
}

// Aliases para compatibilidad con código existente
export function create120IntegrationShape(options = {}) {
  const side = options.side || 'derecha';
  const D = options.D || 600;
  const hasGrommet = !!options.grommet;
  return createLink120SurfaceShape({
    L: 1297,
    L_wing: 1296,
    D,
    side,
    hasGrommet,
    cornerR: options.cornerR || 130,
    gap: 26,
  });
}

export function create360DeskShape(options = {}) {
  return createLink120SurfaceShape({
    L: options.L || 1297,
    L_wing: options.L || 1296,
    D: options.D || 600,
    side: 'derecha',
    hasGrommet: !!options.grommet,
    cornerR: options.cornerR || 130,
    gap: 26,
  });
}
