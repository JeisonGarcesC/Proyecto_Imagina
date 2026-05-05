// src/services/mepalSaludLoader.js
// Lista de códigos MepalSalud disponibles (los que tienen GLB en /assets/models/MepalSalud/)
// Agregar aquí cada nuevo código cuando se añada el GLB correspondiente.
const MEPAL_SALUD_CODES = [
  '22000127958',
];

const cacheByList = new Map();
let cacheMepalSaludItems = null;

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

// Devuelve la lista de items MepalSalud disponibles con precios del XML para el país dado
export async function loadMepalSaludItems(list = 'CO') {
  if (cacheMepalSaludItems) return cacheMepalSaludItems;

  try {
    const priceMap = await loadPriceListMap(list);

    const items = MEPAL_SALUD_CODES.map((code) => {
      const det = priceMap.get(code);
      return {
        codigo: code,
        descripcion: det?.descripcion || code,
        precio: det?.precio || 0,
        udm: det?.udm || 'und',
        found: !!det,
      };
    });

    cacheMepalSaludItems = items;
    return items;
  } catch (err) {
    console.error('[loadMepalSaludItems] Error:', err);
    return MEPAL_SALUD_CODES.map((code) => ({
      codigo: code,
      descripcion: code,
      precio: 0,
      udm: 'und',
      found: false,
    }));
  }
}

export async function getMepalSaludDetail(codigo, list = 'CO') {
  try {
    const map = await loadPriceListMap(list);
    return map.get(String(codigo)) || null;
  } catch {
    return null;
  }
}
