// src/catalog/buildCatalogFromXml.js
import { loadPts } from '../data/ptsLoader.js';
import { loadPriceList, loadPriceListCatalog } from '../data/priceListLoader.js';
import { modelRegistry } from './modelRegistry.js';
import { VETRO_CODE_CATALOG } from '../mepal/vetro/resolvers/vetroProductCodeResolver.js';
import { resolveVetroProduct } from '../mepal/vetro/resolvers/vetroProductResolver.js';

export const CATALOG_COUNTRIES = ['CO', 'EUC', 'USD'];

export function completeVetroCatalog(items, priceLists, priceDescriptions = new Map()) {
  const result = [...items];
  const existing = new Set(result.map((item) => String(item.codigoPT)));
  for (const entry of VETRO_CODE_CATALOG) {
    const code = String(entry.code || '');
    if (!code || existing.has(code)) continue;
    const product = resolveVetroProduct(entry);
    if (!product.codeResolution.supported) continue;
    const description = priceDescriptions.get(code) || product.commercial.description;
    result.push({
      codigoPT: code,
      ui: { title: description, subtitle: entry.reference || '', tags: ['VETRO', entry.category] },
      prices: {
        CO: priceLists.CO.get(code) || 0,
        EUC: priceLists.EUC.get(code) || 0,
        USD: priceLists.USD.get(code) || 0,
      },
      raw: { ...entry, descripcion: description },
      model: modelRegistry[code] || null,
    });
    existing.add(code);
  }
  return result;
}

export async function buildCatalogFromXml() {
  const ptsMap = await loadPts('/data/xml/ptsinbom_4.xml');

  const priceCatalogCO = await loadPriceListCatalog('/data/xml/PriceList_CO_2.xml');
  const pricesCO = new Map([...priceCatalogCO].map(([code, item]) => [code, item.price]));
  const pricesEUC = await loadPriceList('/data/xml/Pricelist_EUC_2.xml');
  const pricesUSD = await loadPriceList('/data/xml/PriceList_USD_2.xml');

  // ✅ Deduplicación fuerte (por si el loader o XML repite)
  const items = [];
  const seen = new Set();

  for (const [codigoPT, p] of ptsMap.entries()) {
    const code = String(codigoPT || '').trim();
    if (!code) continue;

    // ✅ evita duplicados
    if (seen.has(code)) continue;
    seen.add(code);

    const prices = {
      CO: pricesCO.get(code) || 0,
      EUC: pricesEUC.get(code) || 0,
      USD: pricesUSD.get(code) || 0,
    };

    // UI
    const title = p?.descLarga || `Producto ${code}`;
    const subtitle = p?.numeroPlano ? p.numeroPlano : p?.tipo || '';

    const tags = [p?.linea, p?.material, p?.tipo, p?.subTipo].filter(Boolean);

    // Model (si existe)
    const model = modelRegistry[code] || null;

    // ✅ NUEVO: lista completa de genéricos permitidos para este PT
    // - soporta múltiples nombres por si el loader lo trae distinto
    // - normaliza a strings y elimina vacíos y duplicados
    const genericos = Array.from(
      new Set(
        (p?.genericos || p?.recordsGenericos || p?.records_genericos || p?.genericosList || [])
          .map((g) => String(g || '').trim())
          .filter(Boolean)
      )
    );

    items.push({
      codigoPT,
      generico: p.generico || null, // ✅ (lo dejas tal cual)
      genericos, // ✅ NUEVO (NO rompe nada existente)
      materialBase: p.material || null,
      ui: { title, subtitle, tags },
      prices,
      model,
      raw: p,
    });
  }

  // Índice rápido
  const completeItems = completeVetroCatalog(items, { CO: pricesCO, EUC: pricesEUC, USD: pricesUSD }, new Map([...priceCatalogCO].map(([code, item]) => [code, item.description])));
  const byCode = new Map(completeItems.map((it) => [it.codigoPT, it]));

  return { items, byCode };
}
