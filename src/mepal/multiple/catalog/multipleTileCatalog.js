export const MULTIPLE_TILE_TYPES = Object.freeze({
  FORMICA: Object.freeze({ role: 'TILE_FORMICA', materialRole: 'FORMICA', heightsCm: [16, 20, 22, 38, 76] }),
  METAL: Object.freeze({ role: 'TILE_METAL', materialRole: 'METAL', heightsCm: [38, 76], variants: ['SMOOTH', 'PERFORATED', 'EMBOSSED'] }),
  GLASS: Object.freeze({ role: 'TILE_GLASS', materialRole: 'GLASS', heightsCm: [38, 76] }),
  FABRIC: Object.freeze({ role: 'TILE_FABRIC', materialRole: 'FABRIC', heightsCm: [20, 22, 38, 76], variants: ['GAMA_1', 'GAMA_2'] }),
});

export const MULTIPLE_TILE_TYPE_KEYS = Object.freeze(Object.keys(MULTIPLE_TILE_TYPES));

export function resolveMultipleTileType(type) {
  return MULTIPLE_TILE_TYPES[String(type || '').trim().toUpperCase()] || null;
}
import { MULTIPLE_COMMERCIAL_CATALOG } from './multipleCommercialCatalog.generated.js';
export const MULTIPLE_TILE_COMMERCIAL_CATALOG = Object.freeze(MULTIPLE_COMMERCIAL_CATALOG.filter((entry) => entry.type === 'TILE'));
