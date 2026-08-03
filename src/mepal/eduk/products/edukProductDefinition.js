import { getEdukDetail } from '../catalog/edukLoader.js';

export async function getEdukProductDefinition(codigoPT, { country } = {}) {
  const code = String(codigoPT || '').trim();
  const countryKey = String(country || 'CO')
    .trim()
    .toUpperCase();
  const [detailCO, detailEUC, detailUSD] = code
    ? await Promise.all([
        getEdukDetail(code, 'CO'),
        getEdukDetail(code, 'EUC'),
        getEdukDetail(code, 'USD'),
      ])
    : [null, null, null];
  const detail =
    (countryKey === 'EUC' && detailEUC) ||
    (countryKey === 'USD' && detailUSD) ||
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
    legacyKind: 'EDUK',
    family: 'EDUK',
    codigoPT: code,
    modelSources: [`/assets/models/Eduk/${code}.glb`, `/assets/models/${code}.glb`],
    commercialData,
    edukMeta: {
      descripcion: commercialData.descripcion,
      precio: commercialData.precio,
      udm: commercialData.udm,
    },
  };
}
