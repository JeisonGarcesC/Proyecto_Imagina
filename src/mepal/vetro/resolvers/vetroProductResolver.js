import { VETRO_FAMILY } from '../catalog/vetroCategories.js';
import { VETRO_PANEL_MATERIALS } from '../catalog/panelCatalog.js';
import { VETRO_DOOR_LEAF_VARIANTS } from '../catalog/doorLeafCatalog.js';
import { VETRO_DOOR_FRAME_VARIANTS } from '../catalog/doorFrameCatalog.js';
import { resolveVetroProductCode } from './vetroProductCodeResolver.js';
import { getVetroTechnicalDiagnostics } from '../rules/vetroTechnicalDiagnostics.js';

export function normalizeVetroConfig(config = {}) {
  const productType = String(config.productType || 'PANEL').trim().toUpperCase();
  const normalized = {
    productType,
    category: String(config.category || (productType === 'PANEL' ? 'PANELS' : '')).toUpperCase(),
    subcategory: config.subcategory ? String(config.subcategory).toUpperCase() : null,
    variant: config.variant ? String(config.variant).toUpperCase() : null,
    material: config.material ? String(config.material).toUpperCase() : null,
    finish: config.finish ? String(config.finish).toUpperCase() : null,
    nominalWidthCm: config.nominalWidthCm == null ? null : Number(config.nominalWidthCm),
    nominalHeightCm: config.nominalHeightCm == null ? null : Number(config.nominalHeightCm),
    nominalLengthCm: config.nominalLengthCm == null ? null : Number(config.nominalLengthCm),
  };
  return normalized;
}

function displayName(config, entry) {
  if (config.productType === 'PANEL') return VETRO_PANEL_MATERIALS[config.material]?.label || 'Panel Vetro';
  if (config.productType === 'DOOR_LEAF') return VETRO_DOOR_LEAF_VARIANTS[config.variant]?.label || 'Nave puerta Vetro';
  if (config.productType === 'DOOR_FRAME') return VETRO_DOOR_FRAME_VARIANTS[config.variant]?.label || 'Marco puerta Vetro';
  return entry?.label || 'Producto Vetro';
}

export function resolveVetroProduct(input = {}) {
  const config = normalizeVetroConfig(input);
  const codeResolution = resolveVetroProductCode(config);
  const entry = codeResolution.entry;
  const dimensions = {
    nominalWidthCm: entry?.nominalWidthCm ?? config.nominalWidthCm,
    realWidthCm: entry?.realWidthCm ?? null,
    nominalHeightCm: entry?.nominalHeightCm ?? config.nominalHeightCm,
    nominalLengthCm: entry?.nominalLengthCm ?? config.nominalLengthCm,
    documented: entry?.dimensionsCm ? { ...entry.dimensionsCm } : null,
  };
  const diagnostics = [
    ...codeResolution.diagnostics,
    ...getVetroTechnicalDiagnostics({ nominalHeightCm: dimensions.nominalHeightCm, normallyIncluded: entry?.normallyIncluded }),
  ];
  return {
    family: VETRO_FAMILY,
    ...config,
    commercial: { reference: entry?.reference ?? null, variant: config.variant, displayName: displayName(config, entry) },
    panelMaterial: config.material ? { type: config.material, documentedThicknessMm: VETRO_PANEL_MATERIALS[config.material]?.documentedThicknessMm ?? null } : null,
    profileFinish: config.finish ? { type: config.finish } : null,
    dimensions,
    codeResolution: { supported: codeResolution.supported, code: codeResolution.code, source: codeResolution.supported ? 'VETRO_PRODUCT_MAP' : null },
    model: { kind: null, src: null },
    options: { doorType: entry?.doorType ?? null, hasDuct: entry?.hasDuct ?? null, replacementPart: entry?.replacementPart === true, normallyIncluded: entry?.normallyIncluded === true },
    diagnostics,
  };
}
