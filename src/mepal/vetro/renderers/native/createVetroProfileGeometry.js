import { addBox, createNativeRoot, rectangleShape } from './vetroNativeUtils.js';
import { profileMaterialRole } from './vetroNativeMaterials.js';

export function createVetroProfileGeometry(product) {
  const d = product.dimensions.documented;
  const crossAmm = Number(d.width) * 10;
  const lengthMm = Number(product.dimensions.nominalLengthCm ?? d.height) * 10;
  const crossBmm = Number(d.depth) * 10;
  const vertical = product.subcategory === 'VERTICAL';
  const role = profileMaterialRole(product.profileFinish?.type);
  const root = createNativeRoot('VETRO_NATIVE_PROFILE');
  addBox(root, {
    name: 'PROFILE',
    sizeMm: vertical ? [crossAmm, lengthMm, crossBmm] : [lengthMm, crossAmm, crossBmm],
    centerMm: vertical ? [0, lengthMm / 2, 0] : [0, crossAmm / 2, 0],
    materialRole: role,
  });
  return {
    root, approximationFlags: [], diagnostics: [],
    shape2D: rectangleShape('VETRO_PROFILE', vertical ? crossAmm : lengthMm, crossBmm, vertical ? 'Y_LENGTH' : 'X_LENGTH'),
  };
}
