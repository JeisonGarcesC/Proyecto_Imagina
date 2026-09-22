import { defaultLockerConfig } from '../definitions/lockerUiDefaults.js';
import { technicalRange } from '../catalog/lockerCatalog.js';
import { resolveLockerProductCode } from './lockersProductCodeResolver.js';
import { resolveLockerAccessories } from './lockersAccessoryResolver.js';
import {
  resolveLockerFinishCode,
  resolveLockerFinishColor,
  resolveLockerFinishOption,
} from '../catalog/lockerFinishCatalog.js';

export function normalizeLockerConfig(input = {}) {
  const c = { ...defaultLockerConfig(), ...JSON.parse(JSON.stringify(input)) };
  for (const key of ['calibre', 'widthMm', 'heightMm', 'depthMm', 'bayCount'])
    c[key] = Number(c[key]);

  const bodyFinishId = c.bodyFinishId || c.bodyFinish || c.material;
  const autoBodyFinish =
    resolveLockerFinishOption(bodyFinishId, c.material) ||
    resolveLockerFinishOption(c.material, c.material);
  c.bodyFinishId = autoBodyFinish?.id || c.bodyFinishId || 'METALICA_LISO';
  c.bodyFinishCode = c.bodyFinishCode || resolveLockerFinishCode(c.bodyFinishId, c.material);
  c.bodyFinish =
    c.bodyFinish || autoBodyFinish?.color || resolveLockerFinishColor(c.bodyFinishId, c.material);

  if (!Array.isArray(c.bayFinishIds)) c.bayFinishIds = [];
  if (!Array.isArray(c.bayFinishCodes)) c.bayFinishCodes = [];
  c.bayFinishIds = Array.from(
    { length: Math.max(c.bayCount || 1, c.bayFinishIds.length) },
    (_, index) => {
      const value = c.bayFinishIds[index] ?? c.bayFinishIds[0] ?? c.bodyFinishId;
      return value;
    }
  );
  c.bayFinishCodes = c.bayFinishCodes.length
    ? c.bayFinishCodes
    : c.bayFinishIds.map((finishId) => resolveLockerFinishCode(finishId, c.material));
  c.bayFinishes = Array.from({ length: c.bayFinishIds.length }, (_, index) => {
    const finishId = c.bayFinishIds[index] ?? c.bodyFinishId;
    return c.bayFinishes?.[index] || resolveLockerFinishColor(finishId, c.material);
  });

  return c;
}
export function resolveLockerProduct(input = {}) {
  const config = normalizeLockerConfig(input);
  const codeResolution = resolveLockerProductCode(config);
  const accessories = resolveLockerAccessories(config);
  const diagnostics = [
    ...codeResolution.diagnostics,
    ...Object.values(accessories).flatMap((r) => r.diagnostics),
  ];
  const within = (n, range) => range && Number.isFinite(n) && n >= range[0] && n <= range[1];
  const color = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  if (
    !within(config.widthMm, technicalRange.widthMm[config.lockerType]) ||
    !within(config.heightMm, technicalRange.heightMm) ||
    !within(config.depthMm, technicalRange.depthMm) ||
    ![22, 24].includes(config.calibre) ||
    ![1, 2, 3, 4].includes(config.bayCount) ||
    !['METALICA', 'METALICA_EMBEBIDA', 'FORMICA', 'MELAMINA'].includes(config.material) ||
    !color(config.bodyFinish) ||
    !Array.isArray(config.bayFinishes) ||
    !config.bayFinishes.every((v) => v == null || color(v)) ||
    ['extraShelves', 'plinth', 'viewer', 'anchor'].some((k) => typeof config[k] !== 'boolean')
  ) {
    diagnostics.push({
      code: 'LOCKER_INVALID_CONFIGURATION',
      severity: 'ERROR',
      message: 'Revisar dimensiones, material, cantidad y acabados.',
    });
  }
  if (config.material === 'METALICA_EMBEBIDA' && config.bayCount === 1) {
    diagnostics.push({
      code: 'LOCKER_INVALID_CONFIGURATION',
      severity: 'ERROR',
      message:
        '1 nave embebida bloqueada: Cal.22 inactivo; Cal.24 pendiente de confirmar la matriz comercial.',
    });
  }
  const supported = !diagnostics.some((d) => d.severity === 'ERROR');
  const bom = [];
  const add = (entry, quantity, role) => {
    if (entry) bom.push({ code: entry.code, description: entry.description, quantity, role });
  };
  if (supported) {
    add(codeResolution.body, 1, 'BODY');
    add(codeResolution.bay, codeResolution.columns, 'BAY_KIT');
    const kit = bom[bom.length - 1];
    kit.requestedDimensionsMm = {
      heightMm: config.heightMm,
      widthMm: Math.round(config.widthMm / codeResolution.columns),
      depthMm: config.depthMm,
    };
    kit.description +=
      ' · Pedir kit H ' +
      config.heightMm +
      ' × L ' +
      kit.requestedDimensionsMm.widthMm +
      ' × P ' +
      config.depthMm +
      ' mm';
    const total = codeResolution.columns * config.bayCount;
    for (const [role, resolved] of Object.entries(accessories))
      add(resolved.entry, role === 'plinth' ? 1 : total, role.toUpperCase());
  }
  return {
    config,
    supported,
    codeResolution: { ...codeResolution, supported, code: supported ? codeResolution.code : null },
    accessories,
    diagnostics,
    bom,
    columns: codeResolution.columns,
    productKey: supported
      ? `LOCKERS:${config.calibre}:${codeResolution.body.code}:${codeResolution.bay.code}`
      : null,
  };
}
