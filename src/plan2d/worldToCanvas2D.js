export function worldToCanvas2D(x, z, { centerX, centerZ, scale, width, height, invertZ = true }) {
  return [
    (x - centerX) * scale + width / 2,
    (invertZ ? -1 : 1) * (z - centerZ) * scale + height / 2,
  ];
}
