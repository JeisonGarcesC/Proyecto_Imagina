import { MULTIPLE_DEFAULT_CONFIG } from '../definitions/multipleDefaults.js';
import { MultipleComposition } from '../definitions/MultipleComposition.js';
import { validateMultipleCoreRules } from './core/multipleCoreRules.js';

export function normalizeMultipleConfig(input = {}) {
  const config = { ...MULTIPLE_DEFAULT_CONFIG, ...JSON.parse(JSON.stringify(input)) };
  config.frameMode = String(config.frameMode || 'HALF_HEIGHT').toUpperCase();
  config.widthCm = Number(config.widthCm); config.heightCm = Number(config.heightCm); config.thicknessCm = Number(config.thicknessCm);
  config.components = config.components && typeof config.components === 'object' ? config.components : {};
  config.door = config.door && typeof config.door === 'object' ? config.door : null;
  config.growth = config.growth && typeof config.growth === 'object' ? config.growth : null;
  config.columns = Array.isArray(config.columns) ? config.columns : [];
  config.cableTray = config.cableTray && typeof config.cableTray === 'object' ? config.cableTray : null;
  if (config.door?.enabled) {
    config.composition = new MultipleComposition({ frameHeightCm: config.heightCm, baseboardHeightCm: 0,
      slots: [{ slotKey: 'door-0', type: 'DOOR', heightCm: config.heightCm,
        door: { ...config.door, componentKey: 'door-0', heightCm: config.heightCm, widthCm: config.widthCm } }] }).toJSON();
  } else config.composition = MultipleComposition.from(config.composition, config.heightCm).toJSON();
  const validation = validateMultipleCoreRules(config);
  if (!validation.valid) throw new Error(validation.diagnostics[0].code);
  return config;
}
