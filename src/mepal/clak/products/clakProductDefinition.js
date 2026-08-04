import { getClakDetail } from '../catalog/clakLoader.js';

export async function getClakProductDefinition(codigoPT, options = {}) {
  const code = String(codigoPT || '').trim();
  const country = String(options?.country || 'CO')
    .trim()
    .toUpperCase();
  const [detailCO, detailEUC, detailUSD] = code
    ? await Promise.all([
        getClakDetail(code, 'CO'),
        getClakDetail(code, 'EUC'),
        getClakDetail(code, 'USD'),
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
    found: Boolean(detail),
    prices: {
      CO: Number(detailCO?.precio || 0),
      EUC: Number(detailEUC?.precio || 0),
      USD: Number(detailUSD?.precio || 0),
    },
  };

  return {
    kind: 'CATALOG_PRODUCT',
    legacyKind: 'CLAK',
    family: 'CLAK',
    codigoPT: code,
    modelSources: [`/assets/models/Clak/${code}.glb`, `/assets/models/${code}.glb`],
    commercialData,
    clakMeta: {
      descripcion: commercialData.descripcion,
      precio: commercialData.precio,
      udm: commercialData.udm,
    },
  };
}
