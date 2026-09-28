import { validateMultipleCoreRules } from '../rules/core/multipleCoreRules.js';

export function validateMultipleConfiguration(config) {
  return validateMultipleCoreRules(config);
}
