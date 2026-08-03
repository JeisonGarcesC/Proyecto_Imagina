import { getAresDetail } from '../catalog/aresLoader.js';

function normalizeCountry(options) {
  const country = typeof options === 'string' ? options : options?.country;
  return String(country || 'CO')
    .trim()
    .toUpperCase();
}

export async function getAresProductDefinition(codigoPT, options = {}) {
  const code = String(codigoPT || '').trim();
  const country = normalizeCountry(options);
  const [detailCO, detailEUC, detailUSD] = code
    ? await Promise.all([
        getAresDetail(code, 'CO'),
        getAresDetail(code, 'EUC'),
        getAresDetail(code, 'USD'),
      ])
    : [null, null, null];
  const detail =
    (country === 'EUC' && detailEUC) ||
    (country === 'USD' && detailUSD) ||
    detailCO ||
    detailEUC ||
    detailUSD;
  const commercialData = {
    codigo: detail?.codigo || code,
    descripcion: detail?.descripcion || code,
    precio: Number(detail?.precio || 0),
    udm: detail?.udm || 'und',
    prices: {
      CO: Number(detailCO?.precio || 0),
      EUC: Number(detailEUC?.precio || 0),
      USD: Number(detailUSD?.precio || 0),
    },
    found: Boolean(detail),
  };

  return {
    kind: 'CATALOG_PRODUCT',
    legacyKind: 'ARES',
    family: 'ARES',
    codigoPT: code,
    modelSources: [`/assets/models/Ares/${code}.glb`, `/assets/models/${code}.glb`],
    commercialData,
    aresMeta: {
      descripcion: commercialData.descripcion,
      precio: commercialData.precio,
      udm: commercialData.udm,
    },
  };
}
