import { VETRO_PANEL_CODE_CATALOG } from '../catalog/panelCatalog.js';
import { VETRO_DOOR_LEAF_CODE_CATALOG } from '../catalog/doorLeafCatalog.js';
import { VETRO_DOOR_FRAME_CODE_CATALOG } from '../catalog/doorFrameCatalog.js';
import { VETRO_JUNCTION_KIT_CATALOG } from '../catalog/junctionKitCatalog.js';
import { VETRO_PROFILE_CODE_CATALOG } from '../catalog/profileCatalog.js';
import { VETRO_ACCESSORY_CATALOG } from '../catalog/accessoryCatalog.js';

export const VETRO_CODE_NOT_DOCUMENTED = 'VETRO_CODE_NOT_DOCUMENTED';
export const VETRO_CODE_CATALOG = Object.freeze([
  ...VETRO_PANEL_CODE_CATALOG, ...VETRO_DOOR_LEAF_CODE_CATALOG,
  ...VETRO_DOOR_FRAME_CODE_CATALOG, ...VETRO_JUNCTION_KIT_CATALOG,
  ...VETRO_PROFILE_CODE_CATALOG, ...VETRO_ACCESSORY_CATALOG,
]);

const fieldsByType = {
  PANEL: ['material', 'nominalWidthCm', 'nominalHeightCm'],
  DOOR_LEAF: ['variant', 'nominalHeightCm'],
  DOOR_FRAME: ['variant', 'nominalHeightCm', 'finish'],
  JUNCTION_KIT: ['variant'],
  PROFILE: ['variant', 'nominalLengthCm', 'finish'],
  ACCESSORY: ['variant'],
};

function same(a, b) {
  if (a == null || b == null) return a == null && b == null;
  return String(a).toUpperCase() === String(b).toUpperCase();
}

export function resolveVetroProductCode(config = {}) {
  const productType = String(config.productType || '').toUpperCase();
  const fields = fieldsByType[productType] || [];
  const entry = VETRO_CODE_CATALOG.find((candidate) =>
    candidate.productType === productType && fields.every((field) => same(candidate[field], config[field]))
  ) || null;
  if (!entry) {
    return { supported: false, code: null, entry: null, diagnostics: [{ code: VETRO_CODE_NOT_DOCUMENTED, severity: 'ERROR' }] };
  }
  return { supported: true, code: entry.code, entry: { ...entry }, diagnostics: [] };
}
