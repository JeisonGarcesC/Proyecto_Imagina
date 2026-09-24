// Millimetres -> metres, the same unit convention as existing native products.
export const mmToWorld = mm => mm / 1000;
// Visual approximations only: never used by the commercial resolver or BOM.
export const LOCKER_NATIVE_APPROXIMATIONS = Object.freeze({
  sheetThicknessMm: 1.2, metalDoorThicknessMm: 2, railWidthMm: 16,
  insetRailWidthMm: 25, levelerMm: 10, gapMm: 2, insetGapMm: 3,
  shelfLipMm: 20, lockSizeMm: [24, 28, 15], hingeSizeMm: [9, 40, 8],
  viewerSizeMm: [80, 40, 2], anchorSizeMm: [30, 30, 3],
  punchingMarginMm: 120, punchingWidthMm: 90, punchingSlotMm: 3, punchingSpacingMm: 10,
  embeddedHandleMm: [35, 100, 8], insetHandleMm: [35, 65, 10], handleBarMm: 10,
  lockOffsetMm: 65, lockHeightOffsetMm: 55, lockFrontMm: 18, hingeMarginMm: 60, viewerMarginMm: 60,
  viewerFrontMm: 10, handleMountDepthMm: 20, recessThicknessMm: 1, recessWidthRatio: 0.7, recessHeightRatio: 0.65,
  dialSizeMm: [4, 10, 2], dialFirstXMm: -7.5, dialSpacingMm: 5, lockFaceMm: 8, keySlotSizeMm: [3, 12, 1],
  punchingSplitCentersMm: [-25, 25], punchingSplitWidthMm: 35, punchingMarkDepthMm: 1,
  metalHandleClearanceMm: 42, embeddedHandleClearanceMm: 60,
  embeddedHandleCorrectionsMm: [0, 11, 6, 4, 3], embeddedInsetHandleCorrectionsMm: [0, 10.5, 5, 4, 3],
});
// Explicitly documented in fichaTecnicaLocker.pdf pp.3–4.
export const LOCKER_TECHNICAL_DIMENSIONS = Object.freeze({ woodDoorThicknessMm: 15,
  plinthHeightMm: 100, buttonDiameterMm: 18, buttonLengthMm: 26, schwinnLengthMm: 150 });
// Behaviour extracted from CM manija3D2/manijaMadera3D, not dimensional certification.
// CM offsets refer to external asset pivots; native substitutes are flagged approximate.
export const LOCKER_HANDLE_OFFSETS = Object.freeze({
  INCRUSTAR: { x: 65.5, depth: 21, single: -12.5, multiple: -15 },
  BOTON: { x: 76, depth: 28, single: 20.5, multiple: 18 },
  SCHWINN: { x: 74, depth: 36, single: -45, multiple: -47.5 },
  EMBEBIDA: { x: 70, depth: 21, single: -66.5, multiple: -69 },
});
export const LOCKER_APPROXIMATION_FLAG = 'LOCKER_NATIVE_DIMENSION_APPROXIMATED';
