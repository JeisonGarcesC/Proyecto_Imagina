import { MultipleComposition } from '../definitions/MultipleComposition.js';
import { normalizeMultipleConfig } from '../rules/multipleRules.js';
import { createMultipleBaseboardPart, createMultipleFramePart, createMultipleTilePart } from '../parts/multipleParts.js';
import { buildMultipleDoor } from './MultipleDoorBuilder.js';
import { buildMultipleGrowth } from './MultipleGrowthBuilder.js';
import { buildMultipleColumns } from './MultipleColumnBuilder.js';
import { buildMultipleCableTray } from './MultipleCableTrayBuilder.js';
import { resolveMultipleProductCommercial } from '../resolvers/multipleProductResolver.js';
import { resolveMultipleFinish } from '../catalog/multipleFinishCatalog.js';
export function buildMultiple(input = {}) {
  const config = normalizeMultipleConfig(input); const composition = MultipleComposition.from(config.composition, config.heightCm);
  const growthResult = buildMultipleGrowth(config.growth, config.heightCm, config.widthCm);
  const effectiveHeightCm = growthResult.growth?.targetHeightCm || config.heightCm;
  const parts = [createMultipleFramePart(config)]; if (composition.baseboardHeightCm > 0) parts.push(createMultipleBaseboardPart(config));
  const diagnostics = []; let cursorYcm = composition.baseboardHeightCm;
  for (const slot of composition.slots) {
    if (slot.type === 'DOOR') { const doorResult = buildMultipleDoor(slot.door, config.heightCm); parts.push(...doorResult.parts); diagnostics.push(...doorResult.diagnostics); }
    else parts.push(createMultipleTilePart(config, slot, cursorYcm)); cursorYcm += slot.heightCm;
  }
  const columnResult = buildMultipleColumns(config.columns, effectiveHeightCm);
  const cableTrayResult = buildMultipleCableTray(config.cableTray, config.heightCm);
  parts.push(...growthResult.parts, ...columnResult.parts, ...cableTrayResult.parts);
  diagnostics.push(...growthResult.diagnostics, ...columnResult.diagnostics, ...cableTrayResult.diagnostics);
  for (const descriptor of parts) {
    diagnostics.push(...(descriptor.visual?.diagnostics || []).map((item) => ({ ...item, componentKey: descriptor.componentKey })));
    const finishId = config.components?.[descriptor.componentKey]?.finish || null;
    const finishResolution = resolveMultipleFinish(descriptor.visual?.materialRole, finishId);
    if (!finishResolution.supported) throw new Error('MULTIPLE_FINISH_NOT_AVAILABLE');
    diagnostics.push(...finishResolution.diagnostics.map((item) => ({ ...item, componentKey: descriptor.componentKey })));
  }
  const product = { kind: 'MULTIPLE_DEFINITION', config, composition: composition.toJSON(), parts,
    dimensions: { widthCm: config.widthCm, heightCm: effectiveHeightCm, baseHeightCm: config.heightCm, thicknessCm: config.thicknessCm },
    diagnostics };
  return resolveMultipleProductCommercial(product);
}
