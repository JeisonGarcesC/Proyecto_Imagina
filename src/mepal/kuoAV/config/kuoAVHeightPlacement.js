import { KUO_AV_TUNABLES } from './kuoAVTunables.js';

export const KUO_AV_HEIGHT_REFERENCE = Object.freeze({
  surfaceBottomNormalMm: 714,
  surfaceBottomRaisedMm: 1200,
  crossbarTravelMm: 491,
  columnTravelMm: 447,
  socketSupportNormalCorrectionMm: 14,
  grommetNormalCorrectionMm: 15.56,
});

export function resolveKuoAVHeightPlacement(alturaMm = 730, thickMm = 30) {
  const height = Number(alturaMm);
  const thickness = Number(thickMm);
  if (!Number.isFinite(height) || !Number.isFinite(thickness) || thickness <= 0) {
    throw new TypeError('KUO AV: altura y espesor deben ser medidas finitas y positivas.');
  }
  const { ALTURA_MIN_MM: min, ALTURA_MAX_MM: max } = KUO_AV_TUNABLES;
  const clamped = Math.max(min, Math.min(max, height));
  const raised = clamped > min;
  // CET supplies two static mechanism states; intermediate legacy heights use
  // the normal mechanism with a rigid upper-segment displacement.
  const progress = (clamped - min) / (max - min);
  const surfaceTravelMm = progress * (KUO_AV_HEIGHT_REFERENCE.surfaceBottomRaisedMm
    - KUO_AV_HEIGHT_REFERENCE.surfaceBottomNormalMm);
  const surfaceBottomMm = KUO_AV_HEIGHT_REFERENCE.surfaceBottomNormalMm + surfaceTravelMm;
  return {
    alturaMm: clamped,
    raised,
    progress,
    surfaceTravelMm,
    surfaceBottomMm,
    surfaceTopMm: surfaceBottomMm + thickness,
    surfaceCenterMm: surfaceBottomMm + thickness / 2,
    crossbarTravelMm: progress * KUO_AV_HEIGHT_REFERENCE.crossbarTravelMm,
    columnTravelMm: progress * KUO_AV_HEIGHT_REFERENCE.columnTravelMm,
    useRaisedAsset: clamped === max,
  };
}
