import { validateMultipleCoreRules } from './core/multipleCoreRules.js';

export function validateMultipleComposition(config = {}, composition = config.composition) {
  return validateMultipleCoreRules({ ...config, composition });
}
