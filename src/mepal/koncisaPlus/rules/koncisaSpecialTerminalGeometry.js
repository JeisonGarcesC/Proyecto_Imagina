// Dimensiones medidas sobre los GLB terminales 2KSO348/349/366 (100, 120 y 150 cm).
// Los GLB usan un pivote en el inicio de X y ocupan X positivo, Z negativo.
export function resolveKoncisaSpecialTerminalGeometry({ realWidthMm, tipoPuesto, accesoCableado }) {
  const isDouble = String(tipoPuesto).toUpperCase() === 'DOBLE';
  const isPasacable = String(accesoCableado).toUpperCase() === 'PASACABLE';
  const widthMm = Number(realWidthMm);
  return {
    lengthMm: widthMm / 2 + (isPasacable ? 372.5 : 335.5),
    depthMm: isDouble ? (isPasacable ? 210 : 258.5) : (isPasacable ? 105 : 128),
    heightMm: isPasacable ? (isDouble ? 149 : 135.5) : 201,
  };
}

export function resolveKoncisaSpecialTerminalRotationOffsetX({
  baseX, realWidthMm, initialMinX, initialMaxX, rotatedMinX, rotatedMaxX,
}) {
  const surfaceMinX = (Number(baseX) - Number(realWidthMm) / 2) / 1000;
  const surfaceMaxX = (Number(baseX) + Number(realWidthMm) / 2) / 1000;
  const initialAtRight = Math.abs(initialMaxX - surfaceMaxX) <=
    Math.abs(initialMinX - surfaceMinX);
  return initialAtRight ? surfaceMinX - rotatedMinX : surfaceMaxX - rotatedMaxX;
}
