import {
  CRITTERIUM8_CEILING_U_CODE,
  CRITTERIUM8_FAMILY,
  getCritterium8FrameCatalogEntry,
  getCritterium8GrowthModule,
  getCritterium8UprightCatalogEntry,
} from '../catalog/frameCatalog.js';
import { CRITTERIUM8_FORMICA_CODE_CATALOG, CRITTERIUM8_TILE_COMMERCIAL_CATALOG } from '../catalog/tileCatalog.js';
import { isTileCombinationAllowed } from '../rules/tileRules.js';

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
  if (String(tileType || '').trim().toUpperCase() === 'FABRIC') return '22191200878';
  if (String(tileType || '').trim().toUpperCase() !== 'FORMICA') return null;
  return CRITTERIUM8_FORMICA_CODE_CATALOG.find((entry) =>
    entry.widthCm === Number(widthCm) && entry.heightCm === Number(heightCm)
  )?.code || null;
}

// A slot's commercial identity is resolved separately from its two rendered faces.
// Keep the legacy part-code resolver above until the BOM transition is approved.
export function resolveCritterium8TileCommercial({ tileType, widthCm, heightCm, commercialOptions = {} } = {}) {
  const type = String(tileType || '').trim().toUpperCase();
  const width = Number(widthCm);
  const height = Number(heightCm);
  const options = commercialOptions && typeof commercialOptions === 'object' && !Array.isArray(commercialOptions)
    ? { ...commercialOptions }
    : {};
  const metadata = { tileType: type, widthCm: width, heightCm: height, commercialOptions: options };
  const pending = (status, diagnosticCode, message) => ({
    status, code: null, description: null, unit: null, commercialQuantity: null,
    metadata, diagnostics: [{ code: diagnosticCode, message }],
  });

  if (!isTileCombinationAllowed({ type, widthCm: width, heightCm: height })) {
    return pending('INVALID_COMBINATION', 'TILE_COMBINATION_NOT_ALLOWED',
      `La combinación ${type} ${height} × ${width} cm no está permitida.`);
  }

  const rows = CRITTERIUM8_TILE_COMMERCIAL_CATALOG.filter((entry) =>
    entry.tileType === type && entry.widthCm === width && entry.heightCm === height
  );
  if (!rows.length) {
    return pending('INCOMPLETE', 'COMMERCIAL_INFORMATION_INSUFFICIENT',
      'Información comercial insuficiente: no hay código confirmado para esta familia y medida.');
  }

  const specified = Object.entries(options).filter(([, value]) => value != null && String(value).trim() !== '');
  const matches = rows.filter((entry) => specified.every(([key, value]) =>
    Object.hasOwn(entry.criteria, key)
      && String(entry.criteria[key]).trim().toUpperCase() === String(value).trim().toUpperCase()
  ));
  if (!matches.length) {
    return pending('INCOMPLETE', 'COMMERCIAL_INFORMATION_INSUFFICIENT',
      'Información comercial insuficiente: las opciones indicadas no corresponden a un código confirmado.');
  }
  if (matches.length > 1) {
    return pending('AMBIGUOUS', 'MULTIPLE_COMMERCIAL_CODES',
      `Información comercial insuficiente: ${matches.length} códigos corresponden a la medida; falta distinguir la variante.`);
  }
  const row = matches[0];
  // A lone FORMICA row has no competing subtype for this exact measure.
  // Keep the saved options untouched; only ask for subtype when it distinguishes codes.
  const missing = Object.keys(row.criteria).filter((key) =>
    (options[key] == null || String(options[key]).trim() === '')
    && !(type === 'FORMICA' && rows.length === 1 && key === 'subtype')
  );
  if (missing.length) {
    return pending('INCOMPLETE', 'MISSING_COMMERCIAL_OPTIONS',
      `Información comercial insuficiente: faltan ${missing.join(', ')}.`);
  }
  return {
    status: 'RESOLVED', code: row.code,
    description: `Baldosa ${type} ${height} × ${width} cm${Object.values(row.criteria).length ? ` — ${Object.values(row.criteria).join(', ')}` : ''}`,
    unit: 'und',
    commercialQuantity: null, metadata: { ...metadata, source: row.source }, diagnostics: [],
  };
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
