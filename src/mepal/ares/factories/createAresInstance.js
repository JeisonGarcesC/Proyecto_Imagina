import { getAresProductDefinition } from '../products/aresProductDefinition.js';

function normalizeCountry(country) {
  return String(country || 'CO')
    .trim()
    .toUpperCase();
}

function createAresMetadata(definition, country) {
  const codigoPT = String(definition?.codigoPT || '').trim();
  const commercialData = definition?.commercialData || {};
  const countryKey = normalizeCountry(country);
  const unitPrice = Number(commercialData.precio || 0);
  const prices = {
    CO: Number(commercialData.prices?.CO || 0),
    EUC: Number(commercialData.prices?.EUC || 0),
    USD: Number(commercialData.prices?.USD || 0),
  };

  prices[countryKey] = Number(commercialData.prices?.[countryKey] ?? unitPrice);

  const description = commercialData.descripcion || codigoPT;
  const aresParts = [
    {
      code: codigoPT,
      description,
      qty: 1,
      unitPrice,
      prices,
    },
  ];

  return {
    kind: 'ARES',
    codigoPT,
    code: codigoPT,
    name: description,
    aresParts,
    aresMeta: {
      descripcion: description,
      precio: unitPrice,
      udm: commercialData.udm || 'und',
    },
  };
}

export async function createAresInstance({
  codigoPT,
  country = 'CO',
  parent = null,
  getProductDefinition = getAresProductDefinition,
  loadGlb,
} = {}) {
  if (typeof getProductDefinition !== 'function') {
    throw new TypeError('createAresInstance requires getProductDefinition.');
  }
  if (typeof loadGlb !== 'function') {
    throw new TypeError('createAresInstance requires loadGlb.');
  }

  const definition = await getProductDefinition(codigoPT, country);
  const modelSources = Array.isArray(definition?.modelSources) ? definition.modelSources : [];
  if (!modelSources.length) {
    throw new Error(`Ares product ${codigoPT || ''} does not define model sources.`);
  }

  const loaded = await loadGlb(modelSources);
  const object = loaded?.scene || loaded?.object || loaded || null;
  if (!object) {
    throw new Error(`Unable to load Ares product ${definition?.codigoPT || codigoPT || ''}.`);
  }

  const metadata = createAresMetadata(definition, country);
  object.userData = {
    ...(object.userData || {}),
    ...metadata,
  };
  object.name = `ARES_${metadata.codigoPT}`;

  if (parent && object.parent !== parent) parent.add?.(object);

  return {
    object,
    metadata,
    partRecord: {
      code: metadata.codigoPT,
      obj: object,
    },
  };
}
