import {
  CRITTERIUM8_CEILING_U_CODE,
  CRITTERIUM8_FAMILY,
  getCritterium8FrameCatalogEntry,
  getCritterium8GrowthModule,
  getCritterium8UprightCatalogEntry,
} from '../catalog/frameCatalog.js';
import { CRITTERIUM8_FORMICA_CODE_CATALOG } from '../catalog/tileCatalog.js';

const descriptors = {
  FRAME_LEFT_POST: ['Poste izquierdo de marco', 'FICHA_TECNICA'],
  FRAME_RIGHT_POST: ['Poste derecho de marco', 'FICHA_TECNICA'],
  TOP_BEVEL: ['Bisel superior', 'MAPA_PRODUCTO'],
  BOTTOM_PLINTH: ['Zócalo inferior', 'MAPA_PRODUCTO'],
  INTERMEDIATE_PLINTH: ['Zócalo intermedio', 'MAPA_PRODUCTO'],
  TOP_CAP: ['Tapa superior', 'MAPA_PRODUCTO'],
  TILE: ['Baldosa', 'MAPA_PRODUCTO'],
  GROWTH_MODULE: ['Módulo de crecimiento', 'MAPA_PRODUCTO'],
  CEILING_POST: ['Marco montante a techo', 'MAPA_PRODUCTO'],
  CEILING_U: ['U de techo', 'MAPA_PRODUCTO'],
  JUNCTION_KIT: ['Kit de unión', 'MAPA_PRODUCTO'],
  DUCT: ['Ducto', 'FICHA_TECNICA'],
  LEVELER: ['Nivelador', 'FICHA_TECNICA'],
  END_CAP: ['Puntera', 'MAPA_PRODUCTO'],
};

export const CRITTERIUM8_PART_CATALOG = Object.freeze(
  Object.fromEntries(Object.entries(descriptors).map(([type, [displayName, source]]) => [
    type,
    Object.freeze({ type, family: CRITTERIUM8_FAMILY, code: null, displayName, metadata: Object.freeze({ source, codeScope: 'UNRESOLVED_COMPONENT' }) }),
  ]))
);

export function getCritterium8PartCatalogEntry(type) {
  return CRITTERIUM8_PART_CATALOG[String(type || '').trim().toUpperCase()] || null;
}

export function resolveCritterium8TilePartCode({ tileType, widthCm, heightCm } = {}) {
  if (String(tileType || '').trim().toUpperCase() !== 'FORMICA') return null;
  return CRITTERIUM8_FORMICA_CODE_CATALOG.find((entry) =>
    entry.widthCm === Number(widthCm) && entry.heightCm === Number(heightCm)
  )?.code || null;
}

export function resolveCritterium8FrameCommercialCode({ widthCm, heightCm } = {}) {
  return getCritterium8FrameCatalogEntry({ widthCm, heightCm })?.code || null;
}

export function resolveCritterium8GrowthPartCode(widthCm) {
  return getCritterium8GrowthModule(widthCm)?.code || null;
}

export function resolveCritterium8CeilingPostCode({ widthCm, projectHeightCm } = {}) {
  return getCritterium8UprightCatalogEntry({ widthCm, projectHeightCm })?.code || null;
}

export function resolveCritterium8CeilingUCode() {
  return CRITTERIUM8_CEILING_U_CODE;
}
