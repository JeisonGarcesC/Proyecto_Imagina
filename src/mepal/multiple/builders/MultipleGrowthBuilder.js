import { MULTIPLE_GROWTH_TARGETS_CM } from '../catalog/multiplePhase2Catalog.js';

export function buildMultipleGrowth(input = {}, baseHeightCm = 204, widthCm = 90) {
  if (!input?.enabled) return { growth: null, parts: [], diagnostics: [] };
  const targetHeightCm = Number(input.targetHeightCm || 242);
  if (Number(baseHeightCm) !== 204 || !MULTIPLE_GROWTH_TARGETS_CM.includes(targetHeightCm)) throw new Error('MULTIPLE_GROWTH_NOT_SUPPORTED');
  const growth = { componentKey: String(input.componentKey || 'growth-0'), baseHeightCm: 204, targetHeightCm, heightCm: targetHeightCm - 204, widthCm };
  return { growth, parts: [{ componentKey: growth.componentKey, componentRole: 'GROWTH_MODULE',
    commercial: { code: null, description: `Módulo crecimiento 204 a ${targetHeightCm} cm`, includeInBOM: true },
    visual: { ...growth, materialRole: 'PAINTED_METAL' } }], diagnostics: [{ code: 'MULTIPLE_GROWTH_CODE_PENDING', level: 'INFO' }] };
}
