import { getClakProductDefinition } from '../products/clakProductDefinition.js';
import { getClakDetail } from '../catalog/clakLoader.js';

const CLAK_VARIANT_BOM_RECIPES = {
  BP: ['22000036401', 'GROMMET_OR_STD', '22000036407', '22000036402'],
  BA: ['22000036400', 'GROMMET_OR_STD', '22000036407', '22000036403'],
  AP: ['22000036401', 'GROMMET_OR_STD', '22000036408', '22000036402'],
  AA: ['22000036400', 'GROMMET_OR_STD', '22000036408', '22000036403'],
};

const CLAK_BOM_DESCRIPTION_FALLBACKS = {
  '22000036400': 'Clak - Base ancha',
  '22000036401': 'Clak - Base pequena',
  '22000036402': 'Clak - Componente pequeno',
  '22000036403': 'Clak - Componente ancho',
  '22000036407': 'Clak - Soporte bajo',
  '22000036408': 'Clak - Soporte alto',
  '22000036436': 'Clak - Grommet estandar',
  '22000122355': 'Clak - Grommet',
};

function normalizeCountry(country) {
  return String(country || 'CO')
    .trim()
    .toUpperCase();
}

function resolveVariantBomCodes(codigoPT) {
  const raw = String(codigoPT || '').trim();
  if (!raw) return [];

  const hasGrommet = /_grommet$/i.test(raw);
  const baseCode = raw.replace(/_grommet$/i, '').toUpperCase();
  const recipe = CLAK_VARIANT_BOM_RECIPES[baseCode];

  if (!recipe) return [];

  return recipe.map((code) => {
    if (code !== 'GROMMET_OR_STD') return code;
    return hasGrommet ? '22000122355' : '22000036436';
  });
}

function resolveDescription(detailCO, detailEUC, detailUSD, code) {
  return (
    detailCO?.descripcion ||
    detailEUC?.descripcion ||
    detailUSD?.descripcion ||
    CLAK_BOM_DESCRIPTION_FALLBACKS[String(code)] ||
    code
  );
}

async function buildClakParts(codigoPT, country) {
  const countryKey = normalizeCountry(country);
  const variantBomCodes = resolveVariantBomCodes(codigoPT);

  if (!variantBomCodes.length) {
    const detailCO = await getClakDetail(codigoPT, 'CO');
    const detailEUC = await getClakDetail(codigoPT, 'EUC');
    const detailUSD = await getClakDetail(codigoPT, 'USD');
    const prices = {
      CO: Number(detailCO?.precio || 0),
      EUC: Number(detailEUC?.precio || 0),
      USD: Number(detailUSD?.precio || 0),
    };

    return [
      {
        code: codigoPT,
        description: resolveDescription(detailCO, detailEUC, detailUSD, codigoPT),
        qty: 1,
        unitPrice: Number(prices[countryKey] || 0),
        prices,
      },
    ];
  }

  const partDetails = await Promise.all(
    variantBomCodes.map(async (code) => {
      const [detailCO, detailEUC, detailUSD] = await Promise.all([
        getClakDetail(code, 'CO'),
        getClakDetail(code, 'EUC'),
        getClakDetail(code, 'USD'),
      ]);

      const prices = {
        CO: Number(detailCO?.precio || 0),
        EUC: Number(detailEUC?.precio || 0),
        USD: Number(detailUSD?.precio || 0),
      };
      const description = resolveDescription(detailCO, detailEUC, detailUSD, code);

      return {
        code,
        description,
        qty: 1,
        unitPrice: Number(prices[countryKey] || 0),
        prices,
      };
    })
  );

  return partDetails;
}

async function createClakMetadata(definition, object, country) {
  const codigoPT = String(definition?.codigoPT || '').trim();
  const commercialData = definition?.commercialData || {};
  const countryKey = normalizeCountry(country);
  const prices = {
    CO: Number(commercialData.prices?.CO || 0),
    EUC: Number(commercialData.prices?.EUC || 0),
    USD: Number(commercialData.prices?.USD || 0),
  };
  const description = commercialData.descripcion || codigoPT;
  const clakParts = await buildClakParts(codigoPT, countryKey);

  return {
    kind: 'CLAK',
    codigoPT,
    code: codigoPT,
    name: description,
    instanceId: object.uuid,
    clakParts,
    clakMeta: {
      descripcion: description,
      precio: Number(commercialData.precio || 0),
      udm: commercialData.udm || 'und',
    },
  };
}

export async function createClakInstance({
  codigoPT,
  country = 'CO',
  parent: _parent = null,
  getProductDefinition = getClakProductDefinition,
  loadGlb,
} = {}) {
  if (typeof getProductDefinition !== 'function') {
    throw new TypeError('createClakInstance requires getProductDefinition.');
  }
  if (typeof loadGlb !== 'function') {
    throw new TypeError('createClakInstance requires loadGlb.');
  }

  const definition = await getProductDefinition(codigoPT, { country });
  const modelSources = Array.isArray(definition?.modelSources) ? definition.modelSources : [];
  if (!modelSources.length) {
    throw new Error(`Clak product ${codigoPT || ''} does not define model sources.`);
  }

  const loaded = await loadGlb(modelSources);
  const object = loaded?.scene || loaded?.object || loaded || null;
  if (!object) {
    throw new Error(`Unable to load Clak product ${definition?.codigoPT || codigoPT || ''}.`);
  }

  const metadata = await createClakMetadata(definition, object, country);
  object.userData = {
    ...(object.userData || {}),
    ...metadata,
  };
  object.name = `CLAK_${metadata.codigoPT}`;

  return {
    object,
    metadata,
    partRecord: {
      code: metadata.codigoPT,
      obj: object,
    },
  };
}
