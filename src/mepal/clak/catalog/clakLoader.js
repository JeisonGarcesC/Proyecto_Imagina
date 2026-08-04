// src/mepal/clak/catalog/clakLoader.js
// Lee productos Clak desde /assets/models/Clak/clak.json
// y cruza precios desde las listas XML.

const CLAK_CODES_FALLBACK = [];

const cacheByList = new Map();
const clakItemsByList = new Map();
let cacheClakCodes = null;

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

function normalizeClakItemCode(item) {
  if (typeof item === 'string' || typeof item === 'number') {
    return String(item).trim();
  }

  const code = item?.codigo ?? item?.code ?? item?.name;
  return String(code || '').trim();
}

async function loadClakCodes() {
  if (cacheClakCodes) return cacheClakCodes;

  try {
    const res = await fetch('/assets/models/Clak/clak.json');
    if (!res.ok) throw new Error('No se pudo cargar clak.json');

    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : [];

    const uniqueCodes = [];
    const seen = new Set();

    for (const item of arr) {
      const code = normalizeClakItemCode(item);
      if (!code || seen.has(code)) continue;
      seen.add(code);
      uniqueCodes.push(code);
    }

    cacheClakCodes = uniqueCodes;
    return uniqueCodes;
  } catch (err) {
    console.error('[loadClakCodes] Error:', err);
    cacheClakCodes = [...CLAK_CODES_FALLBACK];
    return cacheClakCodes;
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

// Devuelve la lista de items Clak disponibles con precios del XML para el país dado
export async function loadClakItems(list = 'CO') {
  const key = normalizeList(list);
  if (clakItemsByList.has(key)) return clakItemsByList.get(key);

  try {
    const [priceMap, codes] = await Promise.all([
      loadPriceListMap(list),
      loadClakCodes(),
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

    clakItemsByList.set(key, items);
    return items;
  } catch (err) {
    console.error('[loadClakItems] Error:', err);
    return CLAK_CODES_FALLBACK.map((code) => ({
      codigo: code,
      descripcion: code,
      precio: 0,
      udm: 'und',
      found: false,
    }));
  }
}

export async function getClakDetail(codigo, list = 'CO') {
  try {
    const map = await loadPriceListMap(list);
    return map.get(String(codigo)) || null;
  } catch {
    return null;
  }
}
