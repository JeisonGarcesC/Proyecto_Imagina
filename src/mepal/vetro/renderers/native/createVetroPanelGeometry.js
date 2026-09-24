import { addBox, addGlassEdges, createNativeRoot, rectangleShape } from './vetroNativeUtils.js';
import { VETRO_MATERIAL_ROLES } from './vetroNativeMaterials.js';
import { approximationDiagnostics, approximationValue } from './vetroNativeConstants.js';

export function createVetroPanelGeometry(product) {
  const widthMm = Number(product.dimensions.realWidthCm ?? product.dimensions.nominalWidthCm) * 10;
  const heightMm = Number(product.dimensions.nominalHeightCm) * 10;
  const isGlass = product.panelMaterial?.type === 'TEMPERED_GLASS_10MM';
  const approximationFlags = isGlass ? [] : ['F100_VISUAL_THICKNESS_MM'];
  const thicknessMm = isGlass ? 10 : approximationValue('F100_VISUAL_THICKNESS_MM');
  const root = createNativeRoot('VETRO_NATIVE_PANEL');
  const panelBody = addBox(root, {
    name: 'PANEL_BODY', sizeMm: [widthMm, heightMm, thicknessMm],
    centerMm: [0, heightMm / 2, 0],
    materialRole: isGlass ? VETRO_MATERIAL_ROLES.GLASS : VETRO_MATERIAL_ROLES.F100_COMPACT,
  });
  if (isGlass) addGlassEdges(root, panelBody);
  return {
    root, approximationFlags, diagnostics: approximationDiagnostics(approximationFlags),
    shape2D: rectangleShape('VETRO_PANEL', widthMm, thicknessMm),
  };
}
