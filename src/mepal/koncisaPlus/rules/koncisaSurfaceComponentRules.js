import { KONCISA_SURFACE_FINISH_OPTIONS } from './koncisaSurfaceFinishOptions.js';

const POSITIONS = new Set(['LEFT', 'CENTER', 'RIGHT']);
const CABLE_ACCESS_TYPES = new Set(['NONE', 'GROMMET', 'PASACABLE']);

export function getKoncisaSurfaceKey(partOrConfig = {}, fallbackIndex = 0) {
  const explicit = partOrConfig?.componentKey || partOrConfig?.meta?.componentKey;
  if (explicit) return String(explicit);
  const leaderRole = String(
    partOrConfig?.leaderRole || partOrConfig?.meta?.leaderRole || ''
  ).toUpperCase();
  if (leaderRole === 'MAIN') return 'MAIN_SURFACE';
  if (leaderRole === 'RETURN') return 'RETURN_SURFACE';
  const index = Number(
    partOrConfig?.moduleIndex ??
      partOrConfig?.index ??
      partOrConfig?.meta?.moduleIndex ??
      fallbackIndex
  );
  return `SURFACE_${Number.isInteger(index) && index >= 0 ? index : fallbackIndex}`;
}

export function resolveKoncisaSurfaceFinishOption(value, fallback = {}) {
  const id = typeof value === 'string' ? value : value?.finishId;
  const exact = KONCISA_SURFACE_FINISH_OPTIONS.find((option) => option.id === id);
  if (exact) return exact;
  return (
    KONCISA_SURFACE_FINISH_OPTIONS.find(
      (option) =>
        option.finishCode === fallback.finishCode &&
        option.thickMm === Number(fallback.thickMm) &&
        option.variant === String(fallback.variant || '')
    ) || KONCISA_SURFACE_FINISH_OPTIONS[0]
  );
}

export function normalizeKoncisaSurfaceOverride(value = {}, fallback = {}) {
  const finish = resolveKoncisaSurfaceFinishOption(value, fallback);
  const legacyType =
    value.pasacable === true
      ? 'PASACABLE'
      : value.grommet === true
        ? 'GROMMET'
        : value.grommet === false
          ? 'NONE'
          : null;
  const fallbackType =
    fallback.pasacable === true ? 'PASACABLE' : fallback.grommet === true ? 'GROMMET' : 'NONE';
  const requestedType = String(
    value.cableAccessType || legacyType || fallback.cableAccessType || fallbackType
  ).toUpperCase();
  const cableAccessType = CABLE_ACCESS_TYPES.has(requestedType) ? requestedType : 'NONE';
  const position = String(
    value.pasacablePosition || value.grommetPosition || fallback.pasacablePosition || 'CENTER'
  ).toUpperCase();
  const grommetPosition = String(
    value.grommetPosition || fallback.grommetPosition || 'CENTER'
  ).toUpperCase();
  return {
    finishId: finish.id,
    cableAccessType,
    grommet: cableAccessType === 'GROMMET',
    pasacable: cableAccessType === 'PASACABLE',
    grommetFinish:
      String(value.grommetFinish || fallback.grommetFinish || 'ALUMINIUM').toUpperCase() ===
      'PAINTED'
        ? 'PAINTED'
        : 'ALUMINIUM',
    grommetPosition:
      fallback.allowGrommetSidePosition && POSITIONS.has(grommetPosition)
        ? grommetPosition
        : 'CENTER',
    pasacablePosition: POSITIONS.has(position) ? position : 'CENTER',
    floorDuctEnabled:
      value.floorDuctEnabled === true ||
      (value.floorDuctEnabled == null && fallback.floorDuctEnabled === true),
    outletCouplingEnabled:
      value.outletCouplingEnabled === true ||
      (value.outletCouplingEnabled == null && fallback.outletCouplingEnabled === true),
  };
}

export function getKoncisaSurfaceComponentConfig(config, key, fallback = {}) {
  const stored = config?.surfaceOverrides?.[key];
  return normalizeKoncisaSurfaceOverride(stored || {}, {
    ...fallback,
    allowGrommetSidePosition: key === 'MAIN_SURFACE' || key === 'RETURN_SURFACE',
  });
}

export function createKoncisaSurfaceConfigPatch(config, key, patch) {
  if (!key) throw new Error('La superficie Koncisa no tiene una clave estable.');
  if (key === 'MAIN_SURFACE' && Object.hasOwn(patch || {}, 'grommetPosition')) {
    throw new Error('La posición del grommet MAIN no es editable.');
  }
  const fallback = fallbackFromConfig(config, key);
  const current = getKoncisaSurfaceComponentConfig(config, key, fallback);
  const next = normalizeKoncisaSurfaceOverride({ ...current, ...patch }, {
    ...fallback,
    ...current,
    allowGrommetSidePosition: key === 'MAIN_SURFACE' || key === 'RETURN_SURFACE',
  });
  return { ...config, surfaceOverrides: { ...(config?.surfaceOverrides || {}), [key]: next } };
}

export function fallbackFromConfig(config = {}, componentKey = null) {
  if (componentKey === 'SIMPLE_RETURN_SURFACE') return {
    finishCode: '22008689', thickMm: 30, variant: '', finishId: 'FORMICA_30',
    cableAccessType: 'NONE', grommet: false, pasacable: false,
    grommetFinish: 'ALUMINIUM', pasacablePosition: 'CENTER',
  };
  const cableAccessType =
    String(config.tipoPasoCable || '').toLowerCase() === 'pasacable'
      ? 'PASACABLE'
      : String(config.tipoPasoCable || '').toLowerCase() === 'grommet'
        ? 'GROMMET'
        : 'NONE';
  const legacySurfaceConfig =
    componentKey === 'MAIN_SURFACE'
      ? {
          floorDuctEnabled: config.leaderMainFloorDuct?.enabled === true,
          outletCouplingEnabled: config.leaderMainOutletCoupling?.enabled === true,
        }
      : componentKey === 'RETURN_SURFACE'
        ? {
            floorDuctEnabled: config.leaderReturnFloorDuct?.enabled === true,
            outletCouplingEnabled: config.leaderReturnOutletCoupling?.enabled === true,
          }
        : {};
  return {
    finishCode: config.finishCode,
    thickMm: config.thickMm,
    variant: config.variant,
    cableAccessType,
    grommet: cableAccessType === 'GROMMET',
    pasacable: cableAccessType === 'PASACABLE',
    grommetFinish: config.grommetFinish,
    grommetPosition: 'CENTER',
    pasacablePosition: config.pasacablePosition || 'CENTER',
    ...legacySurfaceConfig,
  };
}
