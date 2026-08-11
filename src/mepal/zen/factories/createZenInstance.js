import { getZenProductDefinition } from '../products/zenProductDefinition.js';
import {
  getZenVariantByCode,
  getZenVariantOptionsByCode,
  normalizeZenVariantCode,
} from '../products/zenVariantDefinition.js';

function normalizeCountry(country) {
  const value = String(country || 'CO').trim().toUpperCase();
  if (value === 'EUC' || value === 'USD') return value;
  return 'CO';
}

function resolveRequestedCode(codigoPT, variant) {
  const inputCode = String(codigoPT || '').trim();
  const baseCode = normalizeZenVariantCode(inputCode);
  const requestedVariant = String(variant ?? '')
    .trim()
    .replace(/^_+/, '')
    .replace(/\.glb$/i, '')
    .toLowerCase();

  if (!requestedVariant) return inputCode;
  if (requestedVariant === 'base' || requestedVariant === 'normal') return baseCode;

  const options = getZenVariantOptionsByCode(baseCode) || [];
  const normalizedType = requestedVariant === 'laminate' ? 'lamiante' : requestedVariant;
  const option = options.find(({ variantType }) => variantType === normalizedType);
  if (!option) {
    throw new Error(`Unsupported Zen variant "${variant}" for product ${baseCode}.`);
  }

  return option.variantCode;
}

function createZenMetadata(definition, object, country, variantDefinition) {
  const codigoPT = String(definition?.baseCode || definition?.codigoPT || '').trim();
  const commercialData = definition?.commercialData || {};
  const prices = {
    CO: Number(commercialData.prices?.CO || 0),
    EUC: Number(commercialData.prices?.EUC || 0),
    USD: Number(commercialData.prices?.USD || 0),
  };
  const description = commercialData.descripcion || codigoPT;
  const countryKey = normalizeCountry(country);
  const options = getZenVariantOptionsByCode(codigoPT) || [];
  const almacenVariants = options.map((option) => ({
    variant: option.variant,
    src: option.modelSource,
    category: option.category,
    commercialAddons: option.addons.map((addon) => ({ ...addon })),
  }));
  const almacenAddonParts = (definition?.addons || []).map((addon) => ({
    code: addon.code,
    description: addon.description || addon.code,
    qty: Number(addon.qty || 1),
    unitPrice: Number(addon.unitPrice ?? addon.prices?.[countryKey] ?? 0),
    prices: {
      CO: Number(addon.prices?.CO || 0),
      EUC: Number(addon.prices?.EUC || 0),
      USD: Number(addon.prices?.USD || 0),
    },
  }));

  return {
    kind: 'ALMACENAMIENTO',
    legacyKind: 'ALMACENAMIENTO',
    family: 'ZEN_ALMACENAMIENTO',
    codigoPT,
    code: codigoPT,
    name: description,
    instanceId: object.uuid,
    almacenVariant: variantDefinition?.variant || null,
    almacenCategory: variantDefinition?.category || null,
    almacenVariants,
    almacenAddonParts,
    almacenMeta: {
      descripcion: description,
      precio: Number(commercialData.precio || 0),
      udm: commercialData.udm || 'und',
      prices,
    },
  };
}

export async function createZenInstance({
  codigoPT,
  country = 'CO',
  variant,
  parent: _parent = null,
  getProductDefinition = getZenProductDefinition,
  loadGlb,
} = {}) {
  if (typeof getProductDefinition !== 'function') {
    throw new TypeError('createZenInstance requires getProductDefinition.');
  }
  if (typeof loadGlb !== 'function') {
    throw new TypeError('createZenInstance requires loadGlb.');
  }

  const requestedCode = resolveRequestedCode(codigoPT, variant);
  const variantDefinition = getZenVariantByCode(requestedCode);
  if (!variantDefinition) {
    throw new Error(`Zen product or variant ${requestedCode || codigoPT || ''} is not defined.`);
  }

  const definition = await getProductDefinition(requestedCode, { country });
  const modelSources = Array.isArray(definition?.modelSources) ? definition.modelSources : [];
  if (!modelSources.length) {
    throw new Error(`Zen product ${variantDefinition.baseCode} does not define model sources.`);
  }

  const loaded = await loadGlb(modelSources);
  const object = loaded?.scene || loaded?.object || loaded || null;
  if (!object) {
    throw new Error(`Unable to load Zen product ${variantDefinition.variantCode}.`);
  }

  const metadata = createZenMetadata(definition, object, country, variantDefinition);
  object.userData = {
    ...(object.userData || {}),
    ...metadata,
  };
  object.name = `ALMACENAMIENTO_${variantDefinition.variantCode}`;

  return {
    object,
    metadata,
    partRecord: {
      code: metadata.codigoPT,
      obj: object,
    },
  };
}
