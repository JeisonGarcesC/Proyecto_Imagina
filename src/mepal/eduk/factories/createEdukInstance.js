import { getEdukProductDefinition } from '../products/edukProductDefinition.js';

function createEdukMetadata(definition, object, country) {
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
    kind: 'EDUK',
    codigoPT,
    code: codigoPT,
    name: description,
    instanceId: object.uuid,
    edukParts: [
      {
        code: codigoPT,
        description,
        qty: 1,
        unitPrice: Number(prices[countryKey] || 0),
        prices,
      },
    ],
    edukMeta: {
      descripcion: description,
      precio: Number(commercialData.precio || 0),
      udm: commercialData.udm || 'und',
    },
  };
}

export async function createEdukInstance({
  codigoPT,
  country = 'CO',
  parent: _parent = null,
  getProductDefinition = getEdukProductDefinition,
  loadGlb,
} = {}) {
  if (typeof getProductDefinition !== 'function') {
    throw new TypeError('createEdukInstance requires getProductDefinition.');
  }
  if (typeof loadGlb !== 'function') {
    throw new TypeError('createEdukInstance requires loadGlb.');
  }

  const definition = await getProductDefinition(codigoPT, { country });
  const modelSources = Array.isArray(definition?.modelSources) ? definition.modelSources : [];
  if (!modelSources.length) {
    throw new Error(`Eduk product ${codigoPT || ''} does not define model sources.`);
  }

  const loaded = await loadGlb(modelSources);
  const object = loaded?.scene || loaded?.object || loaded || null;
  if (!object) {
    throw new Error(`Unable to load Eduk product ${definition?.codigoPT || codigoPT || ''}.`);
  }

  const metadata = createEdukMetadata(definition, object, country);
  object.userData = {
    ...(object.userData || {}),
    ...metadata,
  };
  object.name = `EDUK_${metadata.codigoPT}`;

  return {
    object,
    metadata,
    partRecord: {
      code: metadata.codigoPT,
      obj: object,
    },
  };
}
