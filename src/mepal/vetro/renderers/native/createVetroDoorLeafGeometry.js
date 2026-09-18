import { addBox, createNativeRoot, rectangleShape } from './vetroNativeUtils.js';
import { VETRO_MATERIAL_ROLES } from './vetroNativeMaterials.js';
import { approximationDiagnostics, approximationValue } from './vetroNativeConstants.js';

function hardware(root, xMm, heightMm, side) {
  const hinge = approximationValue('DOOR_HINGE_VISUAL_SIZE_MM');
  const lock = approximationValue('DOOR_LOCK_VISUAL_SIZE_MM');
  for (const [name, y] of [['HINGE_BOTTOM', hinge[1]], ['HINGE_TOP', heightMm - hinge[1]]]) {
    addBox(root, { name: name + '_' + side, sizeMm: hinge, centerMm: [xMm, y, 0], materialRole: VETRO_MATERIAL_ROLES.HARDWARE, componentRole: 'HARDWARE' });
  }
  addBox(root, { name: 'LOCK_' + side, sizeMm: lock, centerMm: [-xMm, heightMm / 2, 0], materialRole: VETRO_MATERIAL_ROLES.HARDWARE, componentRole: 'HARDWARE' });
}

export function createVetroDoorLeafGeometry(product) {
  const commercialWidthMm = Number(product.dimensions.nominalWidthCm) * 10;
  const heightMm = Number(product.dimensions.nominalHeightCm) * 10;
  const clearanceMm = approximationValue('DOOR_VISUAL_PERIMETER_CLEARANCE_MM');
  const isDouble = product.commercial.variant === 'DOUBLE';
  const gapMm = isDouble ? approximationValue('DOUBLE_DOOR_VISUAL_CENTER_GAP_MM') : 0;
  const visualTotalWidthMm = commercialWidthMm - clearanceMm * 2;
  const leafWidthMm = isDouble ? (visualTotalWidthMm - gapMm) / 2 : visualTotalWidthMm;
  const visualHeightMm = heightMm - clearanceMm * 2;
  const root = createNativeRoot('VETRO_NATIVE_DOOR_LEAF');
  if (isDouble) {
    const offset = gapMm / 2 + leafWidthMm / 2;
    addBox(root, { name: 'DOOR_LEAF_LEFT', sizeMm: [leafWidthMm, visualHeightMm, 10], centerMm: [-offset, clearanceMm + visualHeightMm / 2, 0], materialRole: VETRO_MATERIAL_ROLES.GLASS });
    addBox(root, { name: 'DOOR_LEAF_RIGHT', sizeMm: [leafWidthMm, visualHeightMm, 10], centerMm: [offset, clearanceMm + visualHeightMm / 2, 0], materialRole: VETRO_MATERIAL_ROLES.GLASS });
    hardware(root, -visualTotalWidthMm / 2 + 25, heightMm, 'LEFT');
    hardware(root, visualTotalWidthMm / 2 - 25, heightMm, 'RIGHT');
  } else {
    addBox(root, { name: 'DOOR_LEAF', sizeMm: [leafWidthMm, visualHeightMm, 10], centerMm: [0, clearanceMm + visualHeightMm / 2, 0], materialRole: VETRO_MATERIAL_ROLES.GLASS });
    hardware(root, -visualTotalWidthMm / 2 + 25, heightMm, 'SINGLE');
  }
  const approximationFlags = ['DOOR_VISUAL_PERIMETER_CLEARANCE_MM', 'DOOR_HINGE_VISUAL_SIZE_MM', 'DOOR_LOCK_VISUAL_SIZE_MM'];
  if (isDouble) approximationFlags.push('DOUBLE_DOOR_VISUAL_CENTER_GAP_MM');
  root.userData.commercialDimensionsMm = { widthMm: commercialWidthMm, heightMm };
  root.userData.visualLeafDimensionsMm = { widthMm: leafWidthMm, heightMm: visualHeightMm, gapMm };
  return { root, approximationFlags, diagnostics: approximationDiagnostics(approximationFlags), shape2D: rectangleShape('VETRO_DOOR_LEAF', commercialWidthMm, 10) };
}
