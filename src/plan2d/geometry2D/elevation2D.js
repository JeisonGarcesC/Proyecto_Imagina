export const ELEVATION_DIRECTIONS = Object.freeze(['front', 'back', 'left', 'right']);

export function projectElevationBounds(sourceBoxes, direction) {
  if (!ELEVATION_DIRECTIONS.includes(direction) || !Array.isArray(sourceBoxes) || !sourceBoxes.length) return null;
  const projected = sourceBoxes.map((box) => {
    const [u0, u1] = direction === 'front' ? [box.min.x, box.max.x]
      : direction === 'back' ? [-box.max.x, -box.min.x]
        : direction === 'left' ? [box.min.z, box.max.z]
          : [-box.max.z, -box.min.z];
    return { minU: u0, maxU: u1, minV: box.min.y, maxV: box.max.y };
  });
  const minU = Math.min(...projected.map((box) => box.minU));
  const maxU = Math.max(...projected.map((box) => box.maxU));
  const minV = Math.min(...projected.map((box) => box.minV));
  const maxV = Math.max(...projected.map((box) => box.maxV));
  const width = Math.max(0.001, maxU - minU);
  const height = Math.max(0.001, maxV - minV);
  return {
    width, height,
    components: projected.map((box) => ({
      x: (box.minU + box.maxU - minU - maxU) / 2,
      y: (minV + maxV - box.minV - box.maxV) / 2,
      width: Math.max(0.001, box.maxU - box.minU),
      height: Math.max(0.001, box.maxV - box.minV),
    })),
  };
}
