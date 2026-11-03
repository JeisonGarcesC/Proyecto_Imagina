import { VETRO_PANEL_WIDTHS } from '../catalog/panelCatalog.js';
import { VETRO_TECHNICAL_MAX_HEIGHT_CM, VETRO_MAX_RUN_LENGTH_CM } from '../rules/vetroDimensionRules.js';

const WIDTHS = [...VETRO_PANEL_WIDTHS].sort((a, b) => b.nominalCm - a.nominalCm);
const COMMERCIAL_HEIGHTS_MM = [2040, 2420, 2800];

export function planVetroLine({ requestedWidthMm, heightMm } = {}) {
  const requested = Number(requestedWidthMm);
  const height = Number(heightMm);
  if (!Number.isFinite(requested) || requested < 300 || requested > VETRO_MAX_RUN_LENGTH_CM * 10) {
    return { success: false, reason: 'VETRO_LINE_WIDTH_OUT_OF_RANGE', compositions: [] };
  }
  if (!COMMERCIAL_HEIGHTS_MM.includes(height) || height > VETRO_TECHNICAL_MAX_HEIGHT_CM * 10) {
    return { success: false, reason: 'VETRO_LINE_HEIGHT_NOT_SUPPORTED', compositions: [] };
  }
  const compositions = [];
  function visit(start, chosen, nominalMm, glassMm) {
    if (chosen.length) {
      compositions.push({
        id: chosen.join('-'),
        panelWidthsMm: [...chosen],
        requestedWidthMm: requested,
        nominalWidthMm: nominalMm,
        nominalDifferenceMm: nominalMm - requested,
        glassWidthSumMm: glassMm,
        heightMm: height,
        measuredWidthMm: null,
        measurementStatus: 'PENDING_ASSEMBLY',
      });
    }
    for (let i = start; i < WIDTHS.length; i++) {
      const width = WIDTHS[i];
      const next = nominalMm + width.nominalCm * 10;
      if (next <= VETRO_MAX_RUN_LENGTH_CM * 10) visit(i, [...chosen, width.nominalCm * 10], next, glassMm + width.realCm * 10);
    }
  }
  visit(0, [], 0, 0);
  compositions.sort((a, b) => Math.abs(a.nominalDifferenceMm) - Math.abs(b.nominalDifferenceMm) || a.panelWidthsMm.length - b.panelWidthsMm.length || a.id.localeCompare(b.id));
  return { success: true, requestedWidthMm: requested, heightMm: height, compositions: compositions.slice(0, 40), totalCandidateCount: compositions.length };
}
