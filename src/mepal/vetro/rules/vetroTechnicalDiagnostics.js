import { VETRO_TECHNICAL_MAX_HEIGHT_CM } from './vetroDimensionRules.js';

export function getVetroTechnicalDiagnostics({ nominalHeightCm, normallyIncluded = false } = {}) {
  const diagnostics = [];
  if (Number(nominalHeightCm) === 318) {
    diagnostics.push({
      code: 'VETRO_HEIGHT_280_318_CONFLICT',
      severity: 'WARNING',
      status: 'PENDING_DEFINITION',
      commercialHeightCm: 318,
      technicalMaximumHeightCm: VETRO_TECHNICAL_MAX_HEIGHT_CM,
    });
  }
  if (normallyIncluded) {
    diagnostics.push({ code: 'VETRO_COMPONENT_NORMALLY_INCLUDED', severity: 'INFO' });
  }
  return diagnostics;
}
