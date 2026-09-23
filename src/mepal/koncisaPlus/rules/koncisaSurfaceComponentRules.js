import { KONCISA_SURFACE_FINISH_OPTIONS } from './koncisaSurfaceFinishOptions.js';

const POSITIONS = new Set(['LEFT', 'CENTER', 'RIGHT']);
const CABLE_ACCESS_TYPES = new Set(['NONE', 'GROMMET', 'PASACABLE']);

export function getKoncisaSurfaceKey(partOrConfig = {}, fallbackIndex = 0) {
  const explicit = partOrConfig?.componentKey || partOrConfig?.meta?.componentKey;
  if (explicit) return String(explicit);
  const leaderRole = String(partOrConfig?.leaderRole || partOrConfig?.meta?.leaderRole || '').toUpperCase();
  if (leaderRole === 'MAIN') return 'MAIN_SURFACE';
  if (leaderRole === 'RETURN') return 'RETURN_SURFACE';
  const index = Number(partOrConfig?.moduleIndex ?? partOrConfig?.index ?? partOrConfig?.meta?.moduleIndex ?? fallbackIndex);
  return `SURFACE_${Number.isInteger(index) && index >= 0 ? index : fallbackIndex}`;
}

export function resolveKoncisaSurfaceFinishOption(value, fallback = {}) {
  const id = typeof value === 'string' ? value : value?.finishId;
  const exact = KONCISA_SURFACE_FINISH_OPTIONS.find((option) => option.id === id);
  if (exact) return exact;
  return KONCISA_SURFACE_FINISH_OPTIONS.find((option) =>
    option.finishCode === fallback.finishCode && option.thickMm === Number(fallback.thickMm) &&
    option.variant === String(fallback.variant || '')) || KONCISA_SURFACE_FINISH_OPTIONS[0];
}

export function normalizeKoncisaSurfaceOverride(value = {}, fallback = {}) {
  const finish = resolveKoncisaSurfaceFinishOption(value, fallback);
  const legacyType = value.pasacable === true
    ? 'PASACABLE'
    : value.grommet === true ? 'GROMMET' : value.grommet === false ? 'NONE' : null;
  const fallbackType = fallback.pasacable === true
    ? 'PASACABLE'
    : fallback.grommet === true ? 'GROMMET' : 'NONE';
  const requestedType = String(value.cableAccessType || legacyType || fallback.cableAccessType || fallbackType).toUpperCase();
  const cableAccessType = CABLE_ACCESS_TYPES.has(requestedType) ? requestedType : 'NONE';
  const position = String(value.pasacablePosition || value.grommetPosition || fallback.pasacablePosition || 'CENTER').toUpperCase();
  return {
    finishId: finish.id,
    cableAccessType,
    grommet: cableAccessType === 'GROMMET',
    pasacable: cableAccessType === 'PASACABLE',
    grommetFinish: String(value.grommetFinish || fallback.grommetFinish || 'ALUMINIUM').toUpperCase() === 'PAINTED' ? 'PAINTED' : 'ALUMINIUM',
    grommetPosition: 'CENTER',
    pasacablePosition: POSITIONS.has(position) ? position : 'CENTER',
  };
}

export function getKoncisaSurfaceComponentConfig(config, key, fallback = {}) {
  const stored = config?.surfaceOverrides?.[key];
  return normalizeKoncisaSurfaceOverride(stored || {}, fallback);
}

export function createKoncisaSurfaceConfigPatch(config, key, patch) {
  if (!key) throw new Error('La superficie Koncisa no tiene una clave estable.');
  const current = getKoncisaSurfaceComponentConfig(config, key, fallbackFromConfig(config));
  const next = normalizeKoncisaSurfaceOverride({ ...current, ...patch }, current);
  return { ...config, surfaceOverrides: { ...(config?.surfaceOverrides || {}), [key]: next } };
}

export function fallbackFromConfig(config = {}) {
  const cableAccessType = String(config.tipoPasoCable || '').toLowerCase() === 'pasacable'
    ? 'PASACABLE'
    : String(config.tipoPasoCable || '').toLowerCase() === 'grommet' ? 'GROMMET' : 'NONE';
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
  };
}
