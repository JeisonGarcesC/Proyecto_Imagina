import { VETRO_PANEL_WIDTHS, VETRO_PANEL_HEIGHTS_CM } from '../catalog/panelCatalog.js';

export const VETRO_COMMERCIAL_HEIGHTS_CM = Object.freeze([204, 242, 280, 318]);
export const VETRO_TECHNICAL_MAX_HEIGHT_CM = 280;
export const VETRO_MAX_RUN_LENGTH_CM = 600;

export function getVetroPanelRealWidthCm(nominalWidthCm) {
  return VETRO_PANEL_WIDTHS.find((item) => item.nominalCm === Number(nominalWidthCm))?.realCm ?? null;
}

export function isVetroCommercialHeight(heightCm) {
  return VETRO_COMMERCIAL_HEIGHTS_CM.includes(Number(heightCm));
}

export function validateVetroPanelDimensions({ nominalWidthCm, nominalHeightCm } = {}) {
  const errors = [];
  if (getVetroPanelRealWidthCm(nominalWidthCm) == null) errors.push('VETRO_PANEL_WIDTH_NOT_DOCUMENTED');
  if (!VETRO_PANEL_HEIGHTS_CM.includes(Number(nominalHeightCm))) errors.push('VETRO_PANEL_HEIGHT_NOT_DOCUMENTED');
  return { valid: errors.length === 0, errors };
}
