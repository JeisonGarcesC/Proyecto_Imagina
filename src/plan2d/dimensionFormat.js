const UNIT_FORMATS = Object.freeze({
  m: { factor: 1, decimals: 2 },
  cm: { factor: 100, decimals: 1 },
  mm: { factor: 1000, decimals: 0 },
});

export function formatDimensionValue(value, unit = 'm') {
  const numericValue = Number(value);
  const normalizedUnit = String(unit || 'm').trim().toLowerCase();
  const format = UNIT_FORMATS[normalizedUnit] || UNIT_FORMATS.m;
  const outputUnit = UNIT_FORMATS[normalizedUnit] ? normalizedUnit : 'm';
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return `${(safeValue * format.factor).toFixed(format.decimals)} ${outputUnit}`;
}
