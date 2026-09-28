import { getMultipleAllowedHeights, getMultipleAllowedWidths, MULTIPLE_BASEBOARD_HEIGHT_CM, MULTIPLE_FRAME_THICKNESS_CM } from '../../catalog/multipleFrameCatalog.js';
import { resolveMultipleTileType } from '../../catalog/multipleTileCatalog.js';
import { isMultipleFinishAllowed } from '../../catalog/multipleFinishCatalog.js';

const issue = (code, message, details = {}) => ({ code, message, level: 'WARNING', ...details });

export function validateMultipleCompositionCore(config = {}, composition = config.composition) {
  const diagnostics = []; const slots = Array.isArray(composition?.slots) ? composition.slots : [];
  const heightCm = Number(config.heightCm ?? composition?.frameHeightCm);
  const baseboardHeightCm = Number(composition?.baseboardHeightCm ?? MULTIPLE_BASEBOARD_HEIGHT_CM);
  const slotKeys = new Set(); const componentKeys = new Set(); let occupiedCm = baseboardHeightCm;
  for (const [index, slot] of slots.entries()) {
    const slotKey = String(slot.slotKey || `slot-${index}`); const componentKey = String(slot.componentKey || `tile-${index}`);
    if (slotKeys.has(slotKey) || componentKeys.has(componentKey)) diagnostics.push(issue('MULTIPLE_DUPLICATE_COMPONENT_KEY', 'Cada slot y componente debe tener una clave única.', { slotKey, componentKey }));
    slotKeys.add(slotKey); componentKeys.add(componentKey);
    const slotHeight = Number(slot.heightCm); const type = String(slot.type || 'TILE').toUpperCase();
    if (type === 'DOOR') {
      if (!config.door?.enabled || slots.length !== 1 || baseboardHeightCm !== 0) diagnostics.push(issue('MULTIPLE_DOOR_INCOMPATIBLE', 'La puerta debe ocupar por sí sola la composición del marco.', { slotKey }));
    } else {
      const tile = resolveMultipleTileType(slot.tileType);
      if (!tile) diagnostics.push(issue('MULTIPLE_MATERIAL_NOT_SUPPORTED', 'El material de baldosa no está soportado.', { slotKey, tileType: slot.tileType }));
      else {
        if (!tile.heightsCm.includes(slotHeight)) diagnostics.push(issue('MULTIPLE_TILE_HEIGHT_NOT_SUPPORTED', 'La altura de baldosa no está documentada para este material.', { slotKey, heightCm: slotHeight }));
        if (slot.variant && (!tile.variants || !tile.variants.includes(String(slot.variant).toUpperCase()))) diagnostics.push(issue('MULTIPLE_TILE_VARIANT_NOT_SUPPORTED', 'La variante no está disponible para este material.', { slotKey, variant: slot.variant }));
        const finishId = config.components?.[componentKey]?.finish;
        if (finishId && !isMultipleFinishAllowed(tile.materialRole, finishId)) diagnostics.push(issue('MULTIPLE_FINISH_NOT_AVAILABLE', 'El acabado no es compatible con el material.', { slotKey, componentKey, finishId }));
      }
    }
    occupiedCm += slotHeight;
  }
  if (Number.isFinite(heightCm)) {
    if (occupiedCm > heightCm) diagnostics.push(issue('MULTIPLE_HEIGHT_EXCEEDED', 'La composición supera la altura disponible.', { occupiedCm, availableCm: heightCm }));
    else if (occupiedCm < heightCm) diagnostics.push(issue('MULTIPLE_HEIGHT_INCOMPLETE', 'La composición no completa la altura disponible.', { occupiedCm, availableCm: heightCm }));
  }
  return { valid: diagnostics.length === 0, diagnostics, occupiedCm, availableCm: heightCm };
}

export function validateMultipleCoreRules(config = {}) {
  const result = validateMultipleCompositionCore(config, config.composition); const diagnostics = [...result.diagnostics];
  const frameMode = String(config.frameMode || 'HALF_HEIGHT').toUpperCase(); const widthCm = Number(config.widthCm); const heightCm = Number(config.heightCm);
  if (!['HALF_HEIGHT', 'FLOOR_TO_CEILING'].includes(frameMode)) diagnostics.push(issue('MULTIPLE_FRAME_MODE_NOT_SUPPORTED', 'El tipo de panel no está soportado.', { frameMode }));
  else {
    if (!getMultipleAllowedWidths(frameMode).includes(widthCm)) diagnostics.push(issue('MULTIPLE_WIDTH_NOT_DOCUMENTED', 'El frente seleccionado no está documentado.', { widthCm }));
    if (!getMultipleAllowedHeights(frameMode).includes(heightCm)) diagnostics.push(issue('MULTIPLE_HEIGHT_NOT_DOCUMENTED', 'La altura seleccionada no está documentada.', { heightCm }));
  }
  if (config.thicknessCm != null && Number(config.thicknessCm) !== MULTIPLE_FRAME_THICKNESS_CM) diagnostics.push(issue('MULTIPLE_THICKNESS_NOT_SUPPORTED', 'El espesor del marco no está documentado.'));
  if (frameMode === 'FLOOR_TO_CEILING' && !config.door?.enabled) diagnostics.push(issue('MULTIPLE_FLOOR_TO_CEILING_REQUIRES_DOOR_OR_PHASE_2_MODULE', 'El panel piso a techo requiere una puerta documentada.'));
  if (config.growth?.enabled && (heightCm !== 204 || Number(config.growth.targetHeightCm) <= heightCm)) diagnostics.push(issue('MULTIPLE_GROWTH_INCOMPATIBLE', 'El crecimiento requiere un panel base de 204 cm y una altura final superior.', { heightCm }));
  return { ...result, valid: diagnostics.length === 0, diagnostics };
}
