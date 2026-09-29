import { MULTIPLE_COLUMN_TYPES } from '../catalog/multiplePhase2Catalog.js';

export function buildMultipleColumns(input = [], effectiveHeightCm = 90) {
  const columns = Array.isArray(input) ? input : [];
  const parts = columns.map((item, index) => {
    const type = String(item.type || 'STRUCTURAL').toUpperCase();
    if (!MULTIPLE_COLUMN_TYPES.includes(type)) throw new Error('MULTIPLE_COLUMN_TYPE_NOT_SUPPORTED');
    const componentKey = String(item.componentKey || `column-${index}`);
    return { componentKey, componentRole: type === 'JUNCTION' ? 'COLUMN_JUNCTION' : 'COLUMN_STRUCTURAL',
      commercial: { code: null, description: type === 'JUNCTION' ? 'Columna de unión Multiple' : 'Columna estructural Multiple', includeInBOM: true },
      visual: { materialRole: 'PAINTED_METAL', type, heightCm: effectiveHeightCm, side: String(item.side || 'RIGHT').toUpperCase() } };
  });
  return { columns: parts.map((part) => ({ componentKey: part.componentKey, type: part.visual.type, side: part.visual.side })), parts,
    diagnostics: parts.length ? [{ code: 'MULTIPLE_COLUMN_CODE_PENDING', level: 'INFO' }] : [] };
}
