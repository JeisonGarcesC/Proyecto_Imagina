// src/services/mepalTekSocialLoader.js
// Lee productos Mepal TekSocial desde /assets/models/Mepal TekSocial/mepalTekSocial.json
// y cruza precios desde las listas XML.

const MEPAL_TEK_SOCIAL_CODES_FALLBACK = [
  '22000115180',
  '22000125226',
  '22000133758',
];

const cacheByList = new Map();
const mepalTekSocialItemsByList = new Map();
let cacheMepalTekSocialCodes = null;

function normalizeList(list) {
  return String(list || 'CO')
    .trim()
    .toUpperCase();
}

function resolvePriceListFile(list) {
  const key = normalizeList(list);

  if (key === 'EC' || key === 'ECUADOR' || key === 'EUC') {
    return '/data/xml/Pricelist_EUC_2.xml';
  }

  if (
    key === 'USD' ||
    key === 'DIST' ||
    key === 'DISTRIBUIDORES' ||
    key === 'DISTRIBUIDOR' ||
    key === 'SUR_AMERICA'
  ) {
    return '/data/xml/PriceList_USD_2.xml';
  }

  return '/data/xml/PriceList_CO_2.xml';
}

function parsePrice(raw) {
  const cleaned = (raw || '').replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : 0;
}

function normalizeMepalItemCode(item) {
  if (typeof item === 'string' || typeof item === 'number') {
    return String(item).trim();
  }

  const code = item?.codigo ?? item?.code ?? item?.name;
  return String(code || '').trim();
}

function isMepalItemDisabled(item) {
  if (!item || typeof item !== 'object') return false;

  const value = item.disabled ?? item.deshabilitado ?? item.enabled;

  if (value == null) return false;
  if (typeof value === 'boolean') {
    // enabled=false should behave as disabled=true.
    if ('enabled' in item) return !value;
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if ('enabled' in item) {
    return ['false', '0', 'no', 'n'].includes(normalized);
  }

  return ['true', '1', 'si', 'sí', 'yes', 'y'].includes(normalized);
}

async function loadMepalTekSocialCodes() {
  if (cacheMepalTekSocialCodes) return cacheMepalTekSocialCodes;

  try {
    const res = await fetch('/assets/models/Mepal TekSocial/mepalTekSocial.json');
    if (!res.ok) throw new Error('No se pudo cargar mepalTekSocial.json');

    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : [];

    const uniqueCodes = [];
    const seen = new Set();

    for (const item of arr) {
      if (isMepalItemDisabled(item)) continue;
      const code = normalizeMepalItemCode(item);
      if (!code || seen.has(code)) continue;
      seen.add(code);
      uniqueCodes.push(code);
    }

    cacheMepalTekSocialCodes = uniqueCodes;
    return uniqueCodes;
  } catch (err) {
    console.error('[loadMepalTekSocialCodes] Error:', err);
    cacheMepalTekSocialCodes = [...MEPAL_TEK_SOCIAL_CODES_FALLBACK];
    return cacheMepalTekSocialCodes;
  }
}

async function loadPriceListMap(list = 'CO') {
  const key = normalizeList(list);

  if (cacheByList.has(key)) {
    return cacheByList.get(key);
  }

  const file = resolvePriceListFile(list);

  const res = await fetch(file);
  if (!res.ok) throw new Error(`No se pudo cargar ${file}`);

  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  const items = Array.from(doc.querySelectorAll('Articulo'));
  const map = new Map();

  for (const it of items) {
    const codigo = it.querySelector('Codigo')?.textContent?.trim();
    if (!codigo) continue;

    const descripcion = it.querySelector('Descripcion')?.textContent?.trim() || '';
    const precioText = it.querySelector('Precio')?.textContent?.trim() || '0';
    const precio = parsePrice(precioText);
    const udm = it.querySelector('UDM')?.textContent?.trim() || 'und';

    map.set(String(codigo), { codigo: String(codigo), descripcion, precio, udm });
  }

  cacheByList.set(key, map);
  return map;
}

// Devuelve la lista de items Mepal TekSocial disponibles con precios del XML para el país dado
export async function loadMepalTekSocialItems(list = 'CO') {
  const key = normalizeList(list);
  if (mepalTekSocialItemsByList.has(key)) return mepalTekSocialItemsByList.get(key);

  try {
    const [priceMap, codes] = await Promise.all([
      loadPriceListMap(list),
      loadMepalTekSocialCodes(),
    ]);

    const items = codes.map((code) => {
      const det = priceMap.get(code);
      return {
        codigo: code,
        descripcion: det?.descripcion || code,
        precio: det?.precio || 0,
        udm: det?.udm || 'und',
        found: !!det,
      };
    });

    mepalTekSocialItemsByList.set(key, items);
    return items;
  } catch (err) {
    console.error('[loadMepalTekSocialItems] Error:', err);
    return MEPAL_TEK_SOCIAL_CODES_FALLBACK.map((code) => ({
      codigo: code,
      descripcion: code,
      precio: 0,
      udm: 'und',
      found: false,
    }));
  }
}

export async function getMepalTekSocialDetail(codigo, list = 'CO') {
  try {
    const map = await loadPriceListMap(list);
    return map.get(String(codigo)) || null;
  } catch {
    return null;
  }
}
