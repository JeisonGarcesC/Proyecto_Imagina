import { addBox, createNativeRoot, rectangleShape } from './vetroNativeUtils.js';
import { VETRO_MATERIAL_ROLES } from './vetroNativeMaterials.js';
import { approximationDiagnostics, approximationValue } from './vetroNativeConstants.js';

export function createVetroAccessoryGeometry(product) {
  const variant = product.commercial.variant;
  const documented = product.dimensions.documented;
  const root = createNativeRoot('VETRO_NATIVE_ACCESSORY');
  let sizeMm;
  let approximationFlags = [];
  if (documented) {
    sizeMm = [Number(documented.width) * 10, Number(documented.height) * 10, Number(documented.depth) * 10];
  } else if (variant === 'DOOR_LOCK_REPLACEMENT') {
    sizeMm = approximationValue('DOOR_LOCK_VISUAL_SIZE_MM');
    approximationFlags = ['DOOR_LOCK_VISUAL_SIZE_MM'];
  } else {
    sizeMm = approximationValue('LEVELING_KIT_VISUAL_SIZE_MM');
    approximationFlags = ['LEVELING_KIT_VISUAL_SIZE_MM'];
  }
  const materialRole = documented ? VETRO_MATERIAL_ROLES.HARDWARE : variant === 'DOOR_LOCK_REPLACEMENT' ? VETRO_MATERIAL_ROLES.HARDWARE : VETRO_MATERIAL_ROLES.LIGHT_GRAY_PLASTIC;
  addBox(root, { name: 'ACCESSORY_BODY', sizeMm, centerMm: [0, sizeMm[1] / 2, 0], materialRole });
  if (variant === 'FLOATING_JOIN_90' || variant === 'FLOATING_JOIN_T') {
    addBox(root, { name: 'ACCESSORY_BRANCH', sizeMm: [sizeMm[2], sizeMm[1], sizeMm[0] / 2], centerMm: [0, sizeMm[1] / 2, sizeMm[2] / 2], materialRole });
  }
  return { root, approximationFlags, diagnostics: approximationDiagnostics(approximationFlags), shape2D: rectangleShape('VETRO_ACCESSORY', sizeMm[0], sizeMm[2]) };
}
