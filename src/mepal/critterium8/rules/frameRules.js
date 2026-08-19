import {
  CRITTERIUM8_CODED_FRAME_WIDTHS_CM,
  CRITTERIUM8_CEILING_U_CODE,
  CRITTERIUM8_DOCUMENTED_WIDTHS_CM,
  CRITTERIUM8_FLOOR_TO_CEILING_HEIGHTS_CM,
  CRITTERIUM8_FRAME_THICKNESS_CM,
  CRITTERIUM8_HALF_HEIGHTS_CM,
  getCritterium8FrameCatalogEntry,
  getCritterium8GrowthModule,
  getCritterium8UprightCatalogEntry,
} from '../catalog/frameCatalog.js';

export const CRITTERIUM8_FRAME_MODES = Object.freeze(['HALF_HEIGHT', 'FLOOR_TO_CEILING']);

export function validateCritterium8FrameDimensions(frame = {}) {
  const errors = [];
  const frameMode = String(frame.frameMode || '').toUpperCase();
  const widthCm = Number(frame.widthCm);
  const heightCm = Number(frame.heightCm);
  const thicknessCm = Number(frame.thicknessCm);

  if (!CRITTERIUM8_FRAME_MODES.includes(frameMode)) errors.push('FRAME_MODE_NOT_SUPPORTED');
  if (!CRITTERIUM8_DOCUMENTED_WIDTHS_CM.includes(widthCm)) errors.push('WIDTH_NOT_DOCUMENTED');
  if (thicknessCm !== CRITTERIUM8_FRAME_THICKNESS_CM) errors.push('INVALID_THICKNESS');

  if (frameMode === 'HALF_HEIGHT' && !CRITTERIUM8_HALF_HEIGHTS_CM.includes(heightCm)) {
    errors.push('HEIGHT_NOT_DOCUMENTED');
  }
  if (
    frameMode === 'FLOOR_TO_CEILING' &&
    !CRITTERIUM8_FLOOR_TO_CEILING_HEIGHTS_CM.includes(heightCm)
  ) {
    errors.push('PROJECT_HEIGHT_NOT_DOCUMENTED');
  }

  const catalogEntry =
    frameMode === 'FLOOR_TO_CEILING'
      ? getCritterium8UprightCatalogEntry({ projectHeightCm: heightCm, widthCm })
      : getCritterium8FrameCatalogEntry({ heightCm, widthCm });

  return {
    valid: errors.length === 0,
    errors,
    catalogCode: catalogEntry?.code || null,
    catalogCodeAvailable: Boolean(catalogEntry),
    codedWidth: CRITTERIUM8_CODED_FRAME_WIDTHS_CM.includes(widthCm),
  };
}

export function validateCritterium8GrowthModule({ widthCm, heightCm = 38 } = {}) {
  const catalogEntry = getCritterium8GrowthModule(widthCm);
  const errors = [];
  if (Number(heightCm) !== 38) errors.push('GROWTH_HEIGHT_MUST_BE_38');
  if (!catalogEntry) errors.push('GROWTH_WIDTH_NOT_DOCUMENTED');
  return { valid: errors.length === 0, errors, catalogEntry };
}

export function resolveCritterium8FloorToCeilingComposition({ projectHeightCm, widthCm } = {}) {
  const upright = getCritterium8UprightCatalogEntry({ projectHeightCm, widthCm });
  if (!upright) return null;
  return {
    projectHeightCm: Number(projectHeightCm),
    widthCm: Number(widthCm),
    components: [
      { type: 'PANEL_FRAME', heightCm: 204, code: getCritterium8FrameCatalogEntry({ heightCm: 204, widthCm })?.code || null },
      { type: 'UPRIGHT_FRAME', code: upright.code },
      { type: 'CEILING_U', code: CRITTERIUM8_CEILING_U_CODE },
    ],
  };
}
