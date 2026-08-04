import { getMepalTekSocialDetail } from '../catalog/tekSocialLoader.js';

export async function getTekSocialProductDefinition(codigoPT, options = {}) {
  const code = String(codigoPT || '').trim();
  const country = String(options?.country || 'CO')
    .trim()
    .toUpperCase();
  const [detailCO, detailEUC, detailUSD] = code
    ? await Promise.all([
        getMepalTekSocialDetail(code, 'CO'),
        getMepalTekSocialDetail(code, 'EUC'),
        getMepalTekSocialDetail(code, 'USD'),
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
    legacyKind: 'MEPAL_TEK_SOCIAL',
    family: 'MEPAL_TEK_SOCIAL',
    codigoPT: code,
    modelSources: [
      `/assets/models/Mepal TekSocial/${code}.glb`,
      `/assets/models/${code}.glb`,
    ],
    commercialData,
    tekSocialMeta: {
      descripcion: commercialData.descripcion,
      precio: commercialData.precio,
      udm: commercialData.udm,
    },
  };
}
