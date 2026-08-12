export const PLAN_SOURCE_TYPES = Object.freeze({
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  DXF: 'DXF',
  DWG: 'DWG',
});

export const PLAN_RENDER_TYPES = Object.freeze({
  RASTER: 'RASTER',
  VECTOR: 'VECTOR',
});

const DEFAULT_LEGACY_TRANSFORM = Object.freeze({
  metersPerPixel: 0.01,
  offsetX: 0,
  offsetZ: 0,
  opacity: 0.35,
});

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createPlanId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `plan-${globalThis.crypto.randomUUID()}`;
  }

  return `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeSourceType(value, fileName = '') {
  const normalized = String(value || '').trim().toUpperCase();
  const extension = String(fileName || '').split('.').pop()?.toUpperCase();

  if (extension === 'PDF') return PLAN_SOURCE_TYPES.PDF;
  if (extension === 'DXF') return PLAN_SOURCE_TYPES.DXF;
  if (extension === 'DWG') return PLAN_SOURCE_TYPES.DWG;
  if (normalized === 'SVG') return PLAN_SOURCE_TYPES.IMAGE;
  if (Object.hasOwn(PLAN_SOURCE_TYPES, normalized)) return PLAN_SOURCE_TYPES[normalized];
  return PLAN_SOURCE_TYPES.IMAGE;
}

function defaultRenderType(sourceType) {
  return sourceType === PLAN_SOURCE_TYPES.DXF || sourceType === PLAN_SOURCE_TYPES.DWG
    ? PLAN_RENDER_TYPES.VECTOR
    : PLAN_RENDER_TYPES.RASTER;
}

export function createPlanDefinition(options = {}) {
  const sourceType = normalizeSourceType(options.sourceType, options.originalFileName);
  const source = options.source || {};
  const transform = options.transform || {};
  const position = transform.position || {};
  const calibration = options.calibration || {};
  const raster = options.raster || {};
  const vector = options.vector || {};

  return {
    id: String(options.id || createPlanId()),
    schemaVersion: 1,
    sourceType,
    renderType: options.renderType || defaultRenderType(sourceType),
    originalFileName: String(options.originalFileName || ''),
    mimeType: String(options.mimeType || ''),
    assetId: options.assetId ?? null,
    source: {
      url: source.url ?? null,
      dataUrl: source.dataUrl ?? null,
    },
    page: options.page ?? null,
    pageCount: options.pageCount ?? null,
    raster: {
      widthPx: raster.widthPx ?? null,
      heightPx: raster.heightPx ?? null,
    },
    vector: {
      bounds: vector.bounds ?? null,
      units: vector.units ?? null,
      layers: Array.isArray(vector.layers) ? [...vector.layers] : [],
      entities: Array.isArray(vector.entities) ? [...vector.entities] : [],
    },
    transform: {
      position: {
        x: finiteNumber(position.x, 0),
        z: finiteNumber(position.z, 0),
      },
      rotation: finiteNumber(transform.rotation, 0),
      scale: finiteNumber(transform.scale, 1),
    },
    calibration: {
      metersPerDocumentUnit:
        calibration.metersPerDocumentUnit === null
          ? null
          : finiteNumber(calibration.metersPerDocumentUnit, 0.01),
      originalMetersPerDocumentUnit:
        calibration.originalMetersPerDocumentUnit == null
          ? null
          : finiteNumber(calibration.originalMetersPerDocumentUnit, null),
      sourceDistance: calibration.sourceDistance ?? null,
      realDistanceMeters: calibration.realDistanceMeters ?? null,
      units: String(calibration.units || 'px'),
      inputUnit: String(calibration.inputUnit || 'm'),
      source: calibration.source ?? null,
      points:
        calibration.points?.a && calibration.points?.b
          ? {
              a: {
                x: finiteNumber(calibration.points.a.x, 0),
                y: finiteNumber(calibration.points.a.y, 0),
              },
              b: {
                x: finiteNumber(calibration.points.b.x, 0),
                y: finiteNumber(calibration.points.b.y, 0),
              },
            }
          : null,
    },
    opacity: finiteNumber(options.opacity, 0.35),
    locked: options.locked !== false,
    visible: options.visible !== false,
    metadata: { ...(options.metadata || {}) },
  };
}

export function normalizePlanDefinition(plan) {
  return createPlanDefinition(plan || {});
}

export function legacyPlanStateToDefinition({
  id,
  src = null,
  kind = null,
  name = '',
  mimeType = '',
  assetId = null,
  raster = null,
  vector = null,
  renderType = null,
  calibration = null,
  locked = true,
  visible = true,
  transform = DEFAULT_LEGACY_TRANSFORM,
} = {}) {
  const isDataUrl = typeof src === 'string' && src.startsWith('data:');

  return createPlanDefinition({
    id,
    sourceType: kind,
    originalFileName: name,
    mimeType,
    assetId,
    raster,
    vector,
    renderType,
    source: {
      url: isDataUrl ? null : src,
      dataUrl: isDataUrl ? src : null,
    },
    transform: {
      position: {
        x: transform.offsetX,
        z: transform.offsetZ,
      },
      rotation: transform.rotation,
      scale: transform.scale,
    },
    calibration: calibration || {
      metersPerDocumentUnit: transform.metersPerPixel,
      sourceDistance: null,
      realDistanceMeters: null,
      units: 'px',
      inputUnit: 'm',
      points: null,
    },
    opacity: transform.opacity,
    locked,
    visible,
  });
}

export function planDefinitionToLegacyState(plan) {
  const normalized = normalizePlanDefinition(plan);

  return {
    src: normalized.source.dataUrl || normalized.source.url,
    kind: normalized.sourceType.toLowerCase(),
    name: normalized.originalFileName,
    locked: normalized.locked,
    visible: normalized.visible,
    transform: {
      metersPerPixel: normalized.calibration.metersPerDocumentUnit,
      offsetX: normalized.transform.position.x,
      offsetZ: normalized.transform.position.z,
      opacity: normalized.opacity,
      rotation: normalized.transform.rotation,
      scale: normalized.transform.scale,
    },
  };
}
