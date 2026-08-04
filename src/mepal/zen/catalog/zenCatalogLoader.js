import { getChairDetail, loadChairsPriceList } from '../../../services/chairsLoader.js';

const ZEN_MANIFEST_URL = '/assets/models/Almacenamiento/manifest.json';

const ZEN_ADDON_CODES = Object.freeze({
  CUSHION: '22000008239',
  LAMINATE: '22000007233',
});

function normalizeCountry(country) {
  const value = String(country || 'CO').trim().toUpperCase();
  if (value === 'EUC' || value === 'USD') return value;
  return 'CO';
}

function normalizeVariant(variant) {
  return String(variant || '').trim().toLowerCase();
}

function resolveZenAddonCodes(variant) {
  const normalized = normalizeVariant(variant);
  const codes = [];

  if (normalized.includes('cushion')) codes.push(ZEN_ADDON_CODES.CUSHION);
  if (normalized.includes('laminate') || normalized.includes('lamiante')) {
    codes.push(ZEN_ADDON_CODES.LAMINATE);
  }

  return codes;
}

async function loadAddonCommercialData(code, country) {
  const [detailCO, detailEUC, detailUSD] = await Promise.all([
    getChairDetail(code, 'CO'),
    getChairDetail(code, 'EUC'),
    getChairDetail(code, 'USD'),
  ]);
  const selected = country === 'EUC' ? detailEUC : country === 'USD' ? detailUSD : detailCO;
  const fallback = selected || detailCO || detailEUC || detailUSD;

  return {
    code,
    description:
      fallback?.descripcion || (code === ZEN_ADDON_CODES.CUSHION ? 'Cushion' : 'Laminate'),
    qty: 1,
    unitPrice: Number(fallback?.precio || 0),
    prices: {
      CO: Number(detailCO?.precio || 0),
      EUC: Number(detailEUC?.precio || 0),
      USD: Number(detailUSD?.precio || 0),
    },
  };
}

export async function loadZenCatalog(country = 'CO') {
  const countryKey = normalizeCountry(country);
  const [response, priceMapCO, priceMapEUC, priceMapUSD] = await Promise.all([
    fetch(ZEN_MANIFEST_URL),
    loadChairsPriceList('CO'),
    loadChairsPriceList('EUC'),
    loadChairsPriceList('USD'),
  ]);

  if (!response.ok) {
    throw new Error(`No se pudo cargar el catálogo Zen Almacenamiento: ${response.status}`);
  }

  const manifest = await response.json();
  const priceMaps = { CO: priceMapCO, EUC: priceMapEUC, USD: priceMapUSD };
  const addonCodes = Array.from(
    new Set((manifest || []).flatMap((entry) => resolveZenAddonCodes(entry?.variant)))
  );
  const addonEntries = await Promise.all(
    addonCodes.map((code) => loadAddonCommercialData(code, countryKey))
  );
  const addonsByCode = new Map(addonEntries.map((entry) => [entry.code, entry]));

  const mapped = (manifest || []).map((entry) => {
    const codeBase = String(entry?.codeBase || entry?.filename || '').replace(/\.glb$/i, '');
    const details = {
      CO: priceMapCO.get(codeBase) || null,
      EUC: priceMapEUC.get(codeBase) || null,
      USD: priceMapUSD.get(codeBase) || null,
    };
    const selectedDetail = details[countryKey];
    const commercialAddons = resolveZenAddonCodes(entry?.variant)
      .map((code) => addonsByCode.get(code))
      .filter(Boolean);

    return {
      codigoPT: codeBase,
      ui: {
        title:
          (selectedDetail?.descripcion || entry?.codeBase || entry?.filename) +
          (entry?.variant ? ` - ${entry.variant}` : ''),
        subtitle: 'Zen Almacenamiento',
      },
      prices: {
        CO: details.CO?.precio || 0,
        EUC: details.EUC?.precio || 0,
        USD: details.USD?.precio || 0,
      },
      model: {
        kind: 'glb',
        src: entry?.url,
        category: entry?.category,
        variant: entry?.variant,
      },
      raw: Object.assign({}, entry, { found: !!selectedDetail }),
      commercialAddons,
    };
  });

  const activeItems = mapped.filter((item) => !item?.raw?.disabled);
  const items = activeItems.filter((item) => !item?.raw?.variant);
  const variantsMap = new Map();

  for (const item of activeItems) {
    const key = item.codigoPT;
    const variant = {
      variant: item.raw?.variant || null,
      src: item.model?.src,
      category: item.model?.category || item.raw?.category,
      commercialAddons: item.commercialAddons,
    };
    if (!variantsMap.has(key)) variantsMap.set(key, []);
    variantsMap.get(key).push(variant);
  }

  return {
    items,
    variantsMap,
    manifest,
    activeItems,
    addons: addonEntries,
    priceMaps,
  };
}
