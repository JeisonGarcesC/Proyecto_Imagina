import { getSaludProductDefinition } from '../products/saludProductDefinition.js';
import {
  getSaludVariantByCode,
  normalizeSaludVariantCode,
} from '../products/saludVariantDefinition.js';

function createSaludMetadata(definition, object, country, variant) {
  const codigoPT = String(definition?.codigoPT || '').trim();
  const commercialData = definition?.commercialData || {};
  const countryKey = String(country || 'CO')
    .trim()
    .toUpperCase();
  const prices = {
    CO: Number(commercialData.prices?.CO || 0),
    EUC: Number(commercialData.prices?.EUC || 0),
    USD: Number(commercialData.prices?.USD || 0),
  };
  const description = commercialData.descripcion || codigoPT;

  return {
    kind: 'MEPAL_SALUD',
    codigoPT,
    code: codigoPT,
    name: description,
    instanceId: object.uuid,
    mepalVariant: variant,
    mepalParts: [
      {
        code: codigoPT,
        description,
        qty: 1,
        unitPrice: Number(prices[countryKey] || 0),
        prices,
      },
    ],
    mepalMeta: {
      descripcion: description,
      precio: Number(commercialData.precio || 0),
      udm: commercialData.udm || 'und',
    },
  };
}

export async function createSaludInstance({
  codigoPT,
  country = 'CO',
  variant = 'normal',
  parent: _parent = null,
  getProductDefinition = getSaludProductDefinition,
  loadGlb,
} = {}) {
  if (typeof getProductDefinition !== 'function') {
    throw new TypeError('createSaludInstance requires getProductDefinition.');
  }
  if (typeof loadGlb !== 'function') {
    throw new TypeError('createSaludInstance requires loadGlb.');
  }

  const baseCode = normalizeSaludVariantCode(codigoPT);
  const normalizedVariant = String(variant || 'normal')
    .trim()
    .toLowerCase();
  if (normalizedVariant !== 'normal' && normalizedVariant !== 'desplegado') {
    throw new Error(`Unsupported Salud variant: ${variant || ''}.`);
  }

  const variantDefinition = getSaludVariantByCode(
    normalizedVariant === 'desplegado' ? `${baseCode}_2` : baseCode
  );
  if (normalizedVariant === 'desplegado' && !variantDefinition) {
    throw new Error(`Salud product ${baseCode} does not support the desplegado variant.`);
  }

  const definition = await getProductDefinition(baseCode, { country });
  const baseModelSources = Array.isArray(definition?.modelSources) ? definition.modelSources : [];
  const modelSources =
    normalizedVariant === 'desplegado'
      ? baseModelSources.map((source) => String(source).replace(/\.glb$/i, '_2.glb'))
      : baseModelSources;
  if (!modelSources.length) {
    throw new Error(`Salud product ${baseCode} does not define model sources.`);
  }

  const loaded = await loadGlb(modelSources);
  const object = loaded?.scene || loaded?.object || loaded || null;
  if (!object) {
    throw new Error(`Unable to load Salud product ${definition?.codigoPT || baseCode}.`);
  }

  const metadata = createSaludMetadata(definition, object, country, normalizedVariant);
  object.userData = {
    ...(object.userData || {}),
    ...metadata,
  };
  object.name = `MEPAL_SALUD_${variantDefinition?.code || metadata.codigoPT}`;

  return {
    object,
    metadata,
    partRecord: {
      code: metadata.codigoPT,
      obj: object,
    },
  };
}
