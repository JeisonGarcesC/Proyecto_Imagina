import { LOCKER_NATIVE_APPROXIMATIONS as A, LOCKER_HANDLE_OFFSETS } from '../renderers/native/lockerNativeConstants.js';
export function getLockerBayWidth({ totalWidth, numberOfBays }) {
  if (!(totalWidth > 0) || !Number.isInteger(numberOfBays) || numberOfBays < 1) throw new RangeError('LOCKER_INVALID_CONFIGURATION');
  return totalWidth / numberOfBays;
}
export function calculateLockerLayout(c, columns) {
  const embedded = c.material === 'METALICA_EMBEBIDA';
  const rail = embedded ? A.insetRailWidthMm : A.railWidthMm;
  const gap = embedded ? A.insetGapMm : A.gapMm;
  const width = getLockerBayWidth({ totalWidth: c.widthMm, numberOfBays: columns });
  const usable = c.heightMm - 2 * rail - A.levelerMm;
  const division = embedded ? A.shelfLipMm + 2 * gap : gap;
  const doorHeight = (usable - (c.bayCount - 1) * division - (embedded ? 2 * gap : 0)) / c.bayCount;
  return { rail, gap, columnWidth: width, doorWidth: width - 2 * rail - 2 * gap,
    doorHeight, pitch: doorHeight + division, bottom: rail + A.levelerMm + (embedded ? gap : 0) };
}
export function calculateHandlePosition({ bayIndex, bayCount, lockerHeight, lockerWidth, handleType, material, pitch = 0 }) {
  const o = LOCKER_HANDLE_OFFSETS[handleType];
  if (!o) return null;
  const embedded = material === 'METALICA_EMBEBIDA';
  const gap = embedded ? A.insetGapMm : A.gapMm;
  const clearHeight = lockerHeight - (embedded ? A.embeddedHandleClearanceMm : A.metalHandleClearanceMm);
  const center = clearHeight / (2 * bayCount) - gap * (bayCount === 1 ? 2 : 1);
  const adjustment = embedded ? (handleType === 'INCRUSTAR' ? A.embeddedInsetHandleCorrectionsMm : A.embeddedHandleCorrectionsMm)[bayCount] : 0;
  return { x: -lockerWidth / 2 + o.x, y: bayIndex * pitch + center + (bayCount === 1 ? o.single : o.multiple) + adjustment, z: o.depth };
}
