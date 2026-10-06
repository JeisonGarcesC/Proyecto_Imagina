import { defaultCritteriumSequenceDraft, validateCritteriumSequenceDraft } from './critterium8Configurator.js';

// Templates contain only configurations already accepted by the CRITERIUM
// configurator. Physical frames and logical slots are created by its normal path.
export const CRITTERIUM_OFFICE_TEMPLATES = Object.freeze([
  { key: 'EMPTY_SYSTEM', label: 'Sistema vacío', sequenceCount: 0, available: true },
  { key: 'SINGLE_MODULE', label: 'Un módulo', moduleCount: 1, available: false,
    reason: 'La secuencia CRITERIUM requiere al menos dos frames físicos.' },
  { key: 'TWO_MODULES', label: 'Dos módulos', moduleCount: 2, available: true },
  { key: 'THREE_MODULES', label: 'Tres módulos', moduleCount: 3, available: true },
  { key: 'CUSTOM', label: 'Composición personalizada', available: true },
]);

export function createCritteriumOfficeSequenceDraft(moduleCount = 2, baseDraft = defaultCritteriumSequenceDraft()) {
  if (!Number.isInteger(moduleCount) || moduleCount < 2 || moduleCount > 6)
    throw new Error('CRITTERIUM_OFFICE_TEMPLATE_UNSUPPORTED_MODULE_COUNT');
  const source = baseDraft.frames?.[0] || defaultCritteriumSequenceDraft().frames[0];
  const frames = Array.from({ length: moduleCount }, (_, index) =>
    structuredClone(baseDraft.frames?.[index] || source));
  const draft = { frames, orientationDeg: Number(baseDraft.orientationDeg || 0) };
  const validation = validateCritteriumSequenceDraft(draft);
  if (!validation.success) throw new Error(validation.reason);
  return draft;
}
