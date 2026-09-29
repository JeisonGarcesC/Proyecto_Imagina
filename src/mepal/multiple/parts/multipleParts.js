import { resolveMultipleTileType } from '../catalog/multipleTileCatalog.js';
const part = (componentKey, componentRole, commercial, visual) => ({ componentKey, componentRole, commercial, visual });
export const createMultipleFramePart = (config) => part('frame-0', 'FRAME', { code: null, description: `Marco panel ${config.heightCm}x${config.widthCm}x${config.thicknessCm} cm` }, { materialRole: 'PAINTED_METAL' });
export const createMultipleBaseboardPart = (config) => part('baseboard-0', 'BASEBOARD', { code: null, description: `Tapa zócalo ${config.widthCm} cm` }, { materialRole: 'PAINTED_METAL' });
export function createMultipleTilePart(config, slot, positionYcm) {
  const tile = resolveMultipleTileType(slot.tileType);
  return part(slot.componentKey || `tile-${slot.index}`, tile.role, { code: slot.codigoPT || null, reference: slot.reference || null, description: `Baldosa ${slot.tileType.toLowerCase()} ${slot.heightCm}x${config.widthCm} cm` },
    { materialRole: tile.materialRole, tileType: slot.tileType, variant: slot.variant, heightCm: slot.heightCm, positionYcm, visualThicknessCm: 1.5,
      diagnostics: [{ code: 'MULTIPLE_VISUAL_DIMENSION_APPROXIMATION', level: 'INFO', field: 'visualThicknessCm' }] });
}
