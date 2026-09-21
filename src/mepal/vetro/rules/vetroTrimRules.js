import { VETRO_PANEL_WIDTHS, VETRO_PANEL_HEIGHTS_CM } from '../catalog/panelCatalog.js';

function nextNominal(value, available) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return [...available].sort((a, b) => a - b).find((item) => item >= numeric) ?? null;
}

export function resolveVetroPanelTrim({ requestedWidthCm, requestedHeightCm } = {}) {
  const billingNominalWidthCm = nextNominal(requestedWidthCm, VETRO_PANEL_WIDTHS.map((item) => item.nominalCm));
  const billingNominalHeightCm = nextNominal(requestedHeightCm, VETRO_PANEL_HEIGHTS_CM);
  return {
    supported: billingNominalWidthCm != null && billingNominalHeightCm != null,
    requestedWidthCm: Number(requestedWidthCm),
    requestedHeightCm: Number(requestedHeightCm),
    billingNominalWidthCm,
    billingNominalHeightCm,
  };
}

export function validateVetroDoorTrim({ requestedWidthCm, nominalWidthCm, requestedHeightCm } = {}) {
  const errors = [];
  if (Number(requestedWidthCm) !== Number(nominalWidthCm)) errors.push('VETRO_DOOR_WIDTH_TRIM_NOT_ALLOWED');
  const billingNominalHeightCm = nextNominal(requestedHeightCm, VETRO_PANEL_HEIGHTS_CM);
  if (billingNominalHeightCm == null) errors.push('VETRO_HEIGHT_TRIM_NOT_DOCUMENTED');
  return { valid: errors.length === 0, errors, billingNominalHeightCm };
}
