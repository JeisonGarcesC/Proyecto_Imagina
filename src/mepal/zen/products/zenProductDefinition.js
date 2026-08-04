import { loadZenCatalog } from '../catalog/zenCatalogLoader.js';
import {
  getZenVariantByCode,
  normalizeZenVariantCode,
} from './zenVariantDefinition.js';

function normalizeCountry(options) {
  const country = typeof options === 'string' ? options : options?.country;
  const value = String(country || 'CO').trim().toUpperCase();
  if (value === 'EUC' || value === 'USD') return value;
  return 'CO';
}

export async function getZenProductDefinition(codigoPT, options = {}) {
  const requestedCode = String(codigoPT || '').trim();
  const country = normalizeCountry(options);
  const variantDefinition = getZenVariantByCode(requestedCode);
  const baseCode = variantDefinition?.baseCode || normalizeZenVariantCode(requestedCode);
  const catalog = await loadZenCatalog(country);
  const priceMaps = catalog?.priceMaps || {};
  const details = {
    CO: priceMaps.CO?.get?.(baseCode) || null,
    EUC: priceMaps.EUC?.get?.(baseCode) || null,
    USD: priceMaps.USD?.get?.(baseCode) || null,
  };
  const detail =
    (country === 'EUC' && details.EUC) ||
    (country === 'USD' && details.USD) ||
    details.CO ||
    details.EUC ||
    details.USD;
  const manifestEntry = (catalog?.manifest || []).find((entry) => {
    const filename = String(entry?.filename || '').replace(/\.glb$/i, '');
    return filename === variantDefinition?.variantCode;
  });
  const modelSources = Array.from(
    new Set(
      [variantDefinition?.modelSource, manifestEntry?.url, `/assets/models/${variantDefinition?.variantCode}.glb`]
        .filter((source) => source && !source.includes('undefined'))
    )
  );
  const commercialData = {
    codigo: detail?.codigo || baseCode,
    descripcion: detail?.descripcion || baseCode,
    precio: Number(detail?.precio || 0),
    udm: detail?.udm || 'und',
    found: Boolean(detail),
    prices: {
      CO: Number(details.CO?.precio || 0),
      EUC: Number(details.EUC?.precio || 0),
      USD: Number(details.USD?.precio || 0),
    },
  };

  return {
    kind: 'CATALOG_PRODUCT',
    legacyKind: 'ALMACENAMIENTO',
    family: 'ZEN_ALMACENAMIENTO',
    codigoPT: baseCode,
    baseCode,
    variantType: variantDefinition?.variantType || 'base',
    modelSources,
    commercialData,
    zenMeta: {
      descripcion: commercialData.descripcion,
      precio: commercialData.precio,
      udm: commercialData.udm,
    },
    addons: (variantDefinition?.addons || []).map((addon) => ({ ...addon })),
  };
}
