const UNIT_SELECTIONS = Object.freeze({
  mm: Object.freeze({ name: 'mm', label: 'Milímetros (mm)', metersPerUnit: 0.001 }),
  cm: Object.freeze({ name: 'cm', label: 'Centímetros (cm)', metersPerUnit: 0.01 }),
  m: Object.freeze({ name: 'm', label: 'Metros (m)', metersPerUnit: 1 }),
  in: Object.freeze({ name: 'in', label: 'Pulgadas (in)', metersPerUnit: 0.0254 }),
  ft: Object.freeze({ name: 'ft', label: 'Pies (ft)', metersPerUnit: 0.3048 }),
});

const UNIT_ALIASES = Object.freeze({
  millimeters: 'mm',
  centimeters: 'cm',
  meters: 'm',
  inches: 'in',
  feet: 'ft',
});

export const DXF_UNIT_SELECTION_OPTIONS = Object.freeze(Object.values(UNIT_SELECTIONS));

const DXF_UNITS = Object.freeze({
  1: Object.freeze({ ...UNIT_SELECTIONS.in, name: 'inches' }),
  2: Object.freeze({ ...UNIT_SELECTIONS.ft, name: 'feet' }),
  4: Object.freeze({ ...UNIT_SELECTIONS.mm, name: 'millimeters' }),
  5: Object.freeze({ ...UNIT_SELECTIONS.cm, name: 'centimeters' }),
  6: Object.freeze({ ...UNIT_SELECTIONS.m, name: 'meters' }),
});

export function resolveDxfUnits(insUnits) {
  const normalized = Number.isFinite(Number(insUnits)) ? Number(insUnits) : 0;
  const resolved = DXF_UNITS[normalized] || null;

  return {
    insUnits: normalized,
    name: resolved?.name || 'unitless',
    metersPerUnit: resolved?.metersPerUnit ?? null,
    detected: Boolean(resolved),
    source: resolved ? '$INSUNITS' : 'UNSPECIFIED',
  };
}

export function resolveDxfUnitSelection(unit) {
  const normalized = String(unit || '').trim().toLowerCase();
  const resolved = UNIT_SELECTIONS[normalized] || null;
  if (!resolved) return null;
  return {
    insUnits: 0,
    name: resolved.name,
    metersPerUnit: resolved.metersPerUnit,
    detected: false,
    source: 'USER',
  };
}

export function getDxfUnitDisplayName(unit) {
  const normalized = String(unit || '').trim().toLowerCase();
  return UNIT_SELECTIONS[UNIT_ALIASES[normalized] || normalized]?.label || String(unit || 'Sin definir');
}

export function createDxfCalibration(units) {
  const detectedScale = units?.detected ? units.metersPerUnit : null;
  return {
    metersPerDocumentUnit: units?.metersPerUnit ?? null,
    originalMetersPerDocumentUnit: detectedScale,
    sourceDistance: null,
    realDistanceMeters: null,
    units: 'dxf-unit',
    inputUnit: UNIT_ALIASES[units?.name] || units?.name || null,
    points: null,
    source: units?.detected ? 'DXF_INSUNITS' : units?.source === 'USER' ? 'MANUAL' : null,
  };
}
