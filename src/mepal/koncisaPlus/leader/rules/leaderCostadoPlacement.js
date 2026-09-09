export function positionLeaderCostadoAssembly(costado, rootPositionMm) {
  const isCostadoAssembly = costado?.model?.kind === 'koncisa-costado-assembly';

  if (!isCostadoAssembly) return costado;

  const assembly = costado?.meta?.costadoAssembly || {};
  const boundedMeasurementKeys = [
    'leftMinZFromPivotMm',
    'leftMaxZFromPivotMm',
    'rightMinZFromPivotMm',
    'rightMaxZFromPivotMm',
    'centerBracketMinZFromPivotMm',
    'centerBracketMaxZFromPivotMm',
    'crossbarInsetXMm',
  ];
  const hasBoundedMeasurements = boundedMeasurementKeys.every(
    (key) => assembly[key] != null && Number.isFinite(Number(assembly[key]))
  );

  // Los ensambles genéricos ubican sus componentes alrededor de una raíz
  // central usando las medidas reales de los GLB. Por eso la raíz del líder
  // debe coincidir con el centro de la superficie, independientemente de la
  // forma del costado.
  if (!hasBoundedMeasurements) {
    costado.position = {
      ...(costado.position || {}),
      ...rootPositionMm,
    };
    costado.meta = {
      ...(costado.meta || {}),
      positioningMode: assembly.positioningMode || costado.meta?.positioningMode,
    };
    return costado;
  }

  costado.meta = {
    ...(costado.meta || {}),
    positioningMode: 'bounded-depth-leader-v1',
    boundedDepthRootPositionMm: rootPositionMm,
  };

  return costado;
}
