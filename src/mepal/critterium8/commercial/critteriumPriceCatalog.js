import { fetchXml } from '../../../data/xmlLoader.js';

const SOURCES = Object.freeze({
  CO: '/data/xml/PriceList_CO_2.xml',
  EUC: '/data/xml/Pricelist_EUC_2.xml',
  USD: '/data/xml/PriceList_USD_2.xml',
});

export function parseCritteriumPriceCatalog(document, source) {
  const currency = document.querySelector('Moneda')?.textContent?.trim() || null;
  const entries = new Map();
  for (const article of document.querySelectorAll('Articulo')) {
    const code = article.querySelector('Codigo')?.textContent?.trim();
    const rawPrice = article.querySelector('Precio')?.textContent?.trim();
    if (!code) continue;
    const price = rawPrice && /^\d+(?:[.,]\d{1,2})?$/.test(rawPrice)
      ? Number(rawPrice.replace(',', '.')) : null;
    const previous = entries.get(code);
    if (previous && previous.unitPrice !== price) entries.set(code, { code, unitPrice: null, ambiguous: true, source });
    else if (!previous) entries.set(code, { code, unitPrice: price, ambiguous: false, source });
  }
  return { source, currency, entries };
}

export async function loadCritteriumPriceCatalog(country) {
  const source = SOURCES[country];
  if (!source) throw new Error('CRITERIUM_PRICE_SOURCE_UNSUPPORTED');
  return parseCritteriumPriceCatalog(await fetchXml(source), source);
}
