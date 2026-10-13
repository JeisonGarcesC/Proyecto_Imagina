import { createCritteriumOfficeSequenceDraft } from './critteriumOfficeTemplates.js';

// These presets describe only layouts accepted by the existing configurator.
// They do not carry codes, finishes, prices, or independent commercial data.
export const CRITTERIUM_LIBRARY_OPTIONS = Object.freeze([
  { key: 'SEQUENCE_2', group: 'SECUENCIAS', label: 'Secuencia estándar · 2 módulos', counts: [2] },
  { key: 'SEQUENCE_3', group: 'SECUENCIAS', label: 'Secuencia estándar · 3 módulos', counts: [3] },
  { key: 'SEQUENCE_CUSTOM', group: 'SECUENCIAS', label: 'Secuencia personalizada' },
  { key: 'MODULE_FRAME', group: 'MÓDULOS', label: 'Frame aislado · configuración comercial parcial' },
  { key: 'OFFICE_EMPTY', group: 'OFICINA', label: 'Oficina vacía', counts: [] },
  { key: 'OFFICE_2', group: 'OFICINA', label: 'Oficina lineal · 1 secuencia', counts: [2] },
  { key: 'OFFICE_2_3', group: 'OFICINA', label: 'Oficina · 2 secuencias separadas', counts: [2, 3] },
  { key: 'OPERATIONS', group: 'OPERACIONES', label: 'Editar, duplicar, conectar y organizar' },
]);

export function resolveCritteriumLibraryDrafts(key) {
  const option = CRITTERIUM_LIBRARY_OPTIONS.find((item) => item.key === key);
  if (!option || !Array.isArray(option.counts)) return null;
  return option.counts.map((count) => createCritteriumOfficeSequenceDraft(count));
}
