import { addBox, createNativeRoot, rectangleShape } from './vetroNativeUtils.js';
import { profileMaterialRole } from './vetroNativeMaterials.js';
import { approximationDiagnostics, approximationValue } from './vetroNativeConstants.js';

export function createVetroDoorFrameGeometry(product) {
  const widthMm = Number(product.dimensions.nominalWidthCm) * 10;
  const heightMm = Number(product.dimensions.nominalHeightCm) * 10;
  const [profileWidthMm, profileDepthMm] = approximationValue('FRAME_PROFILE_VISUAL_SECTION_MM');
  const role = profileMaterialRole(product.profileFinish?.type);
  const root = createNativeRoot('VETRO_NATIVE_DOOR_FRAME');
  addBox(root, { name: 'FRAME_LEFT', sizeMm: [profileWidthMm, heightMm, profileDepthMm], centerMm: [-widthMm / 2, heightMm / 2, 0], materialRole: role });
  addBox(root, { name: 'FRAME_RIGHT', sizeMm: [profileWidthMm, heightMm, profileDepthMm], centerMm: [widthMm / 2, heightMm / 2, 0], materialRole: role });
  addBox(root, { name: 'FRAME_TOP', sizeMm: [widthMm + profileWidthMm, profileWidthMm, profileDepthMm], centerMm: [0, heightMm - profileWidthMm / 2, 0], materialRole: role });
  const approximationFlags = ['FRAME_PROFILE_VISUAL_SECTION_MM'];
  if (product.options?.hasDuct) {
    const [ductWidthMm, ductDepthMm] = approximationValue('FRAME_DUCT_VISUAL_SECTION_MM');
    addBox(root, { name: 'DUCT', sizeMm: [ductWidthMm, heightMm, ductDepthMm], centerMm: [-widthMm / 2, heightMm / 2, 0], materialRole: role });
    approximationFlags.push('FRAME_DUCT_VISUAL_SECTION_MM');
  }
  return { root, approximationFlags, diagnostics: approximationDiagnostics(approximationFlags), shape2D: rectangleShape('VETRO_DOOR_FRAME', widthMm + profileWidthMm, Math.max(profileDepthMm, product.options?.hasDuct ? approximationValue('FRAME_DUCT_VISUAL_SECTION_MM')[1] : 0)) };
}
