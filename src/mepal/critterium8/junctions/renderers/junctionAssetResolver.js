const PROCEDURAL_TYPES = new Set(['TERMINAL', 'DEG_180', 'DEG_180_TYPE_B', 'DEG_90', 'T', 'X']);

function hasDiagnostic(resolution, code) {
  return (resolution?.diagnostics || []).some((item) => item?.code === code);
}

export function resolveCritterium8JunctionAsset({ junction = {}, resolution = {} } = {}) {
  const junctionType = String(resolution.type || junction.type || '').toUpperCase();
  const part = (resolution.parts || []).find((item) => item.type === 'JUNCTION_KIT') || null;
  const replacedByDuct = hasDiagnostic(resolution, 'REPLACED_BY_DUCT');
  const heightTransitionRequired = hasDiagnostic(resolution, 'HEIGHT_TRANSITION_REQUIRED');
  const missingPart = !part || hasDiagnostic(resolution, 'MISSING_JUNCTION_PART');
  const placeholder = heightTransitionRequired || missingPart || !PROCEDURAL_TYPES.has(junctionType);

  return {
    type: replacedByDuct ? 'PROCEDURAL' : placeholder ? 'PLACEHOLDER' : 'PROCEDURAL',
    src: null,
    rendererKey: replacedByDuct ? 'REPLACED_BY_DUCT' : placeholder ? 'DIAGNOSTIC_PLACEHOLDER' : junctionType,
    metadata: {
      junctionType,
      kitCode: part?.code || resolution.kitCode || null,
      variant: junctionType === 'DEG_180_TYPE_B' ? 'TYPE_B' : part?.metadata?.variant || null,
      provisionalGeometry: !replacedByDuct,
      replacedByDuct,
      heightTransitionRequired,
      missingPart,
    },
  };
}
