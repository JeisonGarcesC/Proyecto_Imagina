import { getMepalSaludDetail } from '../catalog/saludLoader.js';

export async function getSaludProductDefinition(codigoPT, options = {}) {
  const code = String(codigoPT || '').trim();
  const country = String(options?.country || 'CO')
    .trim()
    .toUpperCase();
  const [detailCO, detailEUC, detailUSD] = code
    ? await Promise.all([
        getMepalSaludDetail(code, 'CO'),
        getMepalSaludDetail(code, 'EUC'),
        getMepalSaludDetail(code, 'USD'),
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
    legacyKind: 'MEPAL_SALUD',
    family: 'SALUD',
    codigoPT: code,
    modelSources: [`/assets/models/MepalSalud/${code}.glb`, `/assets/models/${code}.glb`],
    commercialData,
    saludMeta: {
      descripcion: commercialData.descripcion,
      precio: commercialData.precio,
      udm: commercialData.udm,
    },
  };
}
