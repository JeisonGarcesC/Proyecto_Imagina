export function resolveKuoAVDobleHeightPlacement(alturaMm = 730, thickMm = 30) {
  const height = Number(alturaMm);
  const thickness = Number(thickMm);
  if (!Number.isFinite(height) || !Number.isFinite(thickness) || thickness <= 0) {
    throw new TypeError('KUO AV doble: altura y espesor deben ser medidas finitas y positivas.');
  }
  const clamped = Math.max(730, Math.min(1200, height));
  const progress = (clamped - 730) / 470;
  const surfaceBottomMm = 714 + progress * 487;
  return {
    alturaMm: clamped,
    progress,
    useRaisedAsset: clamped === 1200,
    surfaceBottomMm,
    surfaceTopMm: surfaceBottomMm + thickness,
    surfaceCenterMm: surfaceBottomMm + thickness / 2,
    beamTravelMm: progress * 491,
    socketTravelMm: progress * 485,
    grommetTravelMm: progress * 489,
    columnTravelMm: progress * 447,
  };
}
