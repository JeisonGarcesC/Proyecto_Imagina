import { getTekSocialProductDefinition } from '../products/tekSocialProductDefinition.js';

function createTekSocialMetadata(definition, object, country) {
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
    kind: 'MEPAL_TEK_SOCIAL',
    codigoPT,
    code: codigoPT,
    name: description,
    instanceId: object.uuid,
    mepalTekSocialParts: [
      {
        code: codigoPT,
        description,
        qty: 1,
        unitPrice: Number(prices[countryKey] || 0),
        prices,
      },
    ],
    mepalTekSocialMeta: {
      descripcion: description,
      precio: Number(commercialData.precio || 0),
      udm: commercialData.udm || 'und',
    },
  };
}

export async function createTekSocialInstance({
  codigoPT,
  country = 'CO',
  parent: _parent = null,
  getProductDefinition = getTekSocialProductDefinition,
  loadGlb,
} = {}) {
  if (typeof getProductDefinition !== 'function') {
    throw new TypeError('createTekSocialInstance requires getProductDefinition.');
  }
  if (typeof loadGlb !== 'function') {
    throw new TypeError('createTekSocialInstance requires loadGlb.');
  }

  const definition = await getProductDefinition(codigoPT, { country });
  const modelSources = Array.isArray(definition?.modelSources) ? definition.modelSources : [];
  if (!modelSources.length) {
    throw new Error(`Tek Social product ${codigoPT || ''} does not define model sources.`);
  }

  const loaded = await loadGlb(modelSources);
  const object = loaded?.scene || loaded?.object || loaded || null;
  if (!object) {
    throw new Error(
      `Unable to load Tek Social product ${definition?.codigoPT || codigoPT || ''}.`
    );
  }

  const metadata = createTekSocialMetadata(definition, object, country);
  object.userData = {
    ...(object.userData || {}),
    ...metadata,
  };
  object.name = `MEPAL_TEK_SOCIAL_${metadata.codigoPT}`;

  return {
    object,
    metadata,
    partRecord: {
      code: metadata.codigoPT,
      obj: object,
    },
  };
}
