import { createMultipleConfigurationState } from './multipleConfigurationState.js';
import { validateMultipleConfiguration } from './multipleConfigurationRules.js';

export function configureMultiple(input = {}) {
  try {
    const config = createMultipleConfigurationState(input);
    const validation = validateMultipleConfiguration(config);
    return { success: validation.valid, config, composition: config.composition, diagnostics: validation.diagnostics };
  } catch (error) {
    return { success: false, config: null, composition: null, diagnostics: [{ code: error.message || 'MULTIPLE_CONFIGURATION_NOT_SUPPORTED', message: 'La configuración no está soportada.', level: 'WARNING' }] };
  }
}
