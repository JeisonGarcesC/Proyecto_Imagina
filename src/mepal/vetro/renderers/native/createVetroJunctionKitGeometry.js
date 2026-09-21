import { addBox, createNativeRoot, rectangleShape } from './vetroNativeUtils.js';
import { VETRO_MATERIAL_ROLES } from './vetroNativeMaterials.js';

export function createVetroJunctionKitGeometry(product) {
  const d = product.dimensions.documented;
  const widthMm = Number(d.width) * 10;
  const lengthMm = Number(d.height) * 10;
  const depthMm = Number(d.depth) * 10;
  const variant = product.commercial.variant;
  const root = createNativeRoot('VETRO_NATIVE_JUNCTION_KIT');
  addBox(root, { name: 'PROFILE', sizeMm: [widthMm, lengthMm, depthMm], centerMm: [0, lengthMm / 2, 0], materialRole: VETRO_MATERIAL_ROLES.POLYCARBONATE });
  if (variant === 'JOIN_90' || variant === 'JOIN_T') {
    addBox(root, { name: 'PROFILE_BRANCH', sizeMm: [depthMm, lengthMm, widthMm], centerMm: [widthMm / 2, lengthMm / 2, depthMm / 2], materialRole: VETRO_MATERIAL_ROLES.POLYCARBONATE });
  }
  if (variant === 'JOIN_T') {
    addBox(root, { name: 'PROFILE_BRANCH_OPPOSITE', sizeMm: [depthMm, lengthMm, widthMm], centerMm: [-widthMm / 2, lengthMm / 2, depthMm / 2], materialRole: VETRO_MATERIAL_ROLES.POLYCARBONATE });
  }
  return { root, approximationFlags: [], diagnostics: [], shape2D: rectangleShape('VETRO_JUNCTION_KIT', widthMm, depthMm) };
}
