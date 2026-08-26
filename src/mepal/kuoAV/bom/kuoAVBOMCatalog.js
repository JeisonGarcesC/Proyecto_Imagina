import { buildKuoAV } from '../builder/KuoAVBuilder.js';

const STRUCTURAL_TYPES = new Set(['superficie', 'columna', 'viga', 'ducto']);

const FIXED_SAP_CODES = Object.freeze({
  control: '22024327',
  soporte_tomas: '22000116338',
  vertebra: '22000116690',
});

const WIDTH_SAP_CODES = Object.freeze({
  viga: {
    1200: '22000116693',
    1500: '22000116336',
    1650: '22000116694',
  },
  ducto: {
    1200: '22000134911',
    1500: '22000134910',
    1650: '22000134912',
  },
});

const SURFACE_SAP_CODES = Object.freeze({
  FORMICA: {
    '1200x600': '22000008989',
    '1200x750': '22000008992',
    '1500x600': '22000008990',
    '1500x750': '22000008993',
    '1650x600': '22000114412',
    '1650x750': '22000114414',
  },
  MELAMINA: {
    '1200x600': '22000114423',
    '1500x600': '22000114425',
  },
});

const POWER_KIT_SAP_CODES = Object.freeze({
  BLANCO: '22000126680',
  NEGRO: '22000126681',
  GRIS: '22000128023',
});

function normalizeUpper(value) {
  return String(value || '')
    .trim()
    .toLocaleUpperCase('es');
}

function resolveSurfaceMaterial(config) {
  const value = normalizeUpper(
    config.espesorTipo || config.espesor || config.finishCode || 'FORMICA'
  );
  return value.includes('MELAMINA') ? 'MELAMINA' : 'FORMICA';
}

function resolveKuoAVSapCode(part, config) {
  if (FIXED_SAP_CODES[part.type]) return FIXED_SAP_CODES[part.type];

  if (part.type === 'kit_fuente') {
    const color = normalizeUpper(config.kitFuenteColor || config.acabadoParales || 'BLANCO');
    return POWER_KIT_SAP_CODES[color] || POWER_KIT_SAP_CODES.BLANCO;
  }

  if (part.type === 'columna') {
    return part.meta?.side === 'right' ? '22000128083' : '22000128084';
  }

  if (WIDTH_SAP_CODES[part.type]) {
    const widthMm = Number(config.anchoMm);
    const variantWidthMm = widthMm <= 1350 ? 1200 : widthMm <= 1550 ? 1500 : 1650;
    return WIDTH_SAP_CODES[part.type][variantWidthMm] || part.code;
  }

  if (part.type === 'grommet') {
    return normalizeUpper(config.acabadoGrommet) === 'ALUMINIUM'
      ? '22000023626'
      : '22000116523';
  }

  if (part.type === 'superficie') {
    const widthMm = Number(part.billingDimMm?.widthMm || part.dimMm?.widthMm);
    const depthMm = Number(part.billingDimMm?.depthMm || part.dimMm?.depthMm);
    const material = resolveSurfaceMaterial(config);
    return SURFACE_SAP_CODES[material]?.[`${widthMm}x${depthMm}`] || part.code;
  }

  return part.code || part.logicalCode;
}

function toBomItem(part, config) {
  const isSpecial = !!config.especial;
  const code = resolveKuoAVSapCode(part, config);
  const description = `${isSpecial && STRUCTURAL_TYPES.has(part.type) ? 'SPECIAL: ' : ''}${
    part.name || part.logicalCode || part.code
  }`;

  return {
    code: String(code),
    codigo: String(code),
    lookupTag: part.lookupTag || part.logicalCode || part.code,
    logicalCode: part.logicalCode || part.lookupTag || part.code,
    description,
    descripcion: description,
    qty: 1,
    cantidad: 1,
    role: part.role,
    type: part.type,
    dimMm: part.dimMm,
    unitPrice: 0,
    prices: { CO: 0, EUC: 0, USD: 0 },
  };
}

export function buildKuoAVBOM(built) {
  if (!built || !Array.isArray(built.parts)) {
    throw new TypeError('buildKuoAVBOM: se requiere una estructura KUO AV construida.');
  }

  const rows = new Map();
  for (const part of built.parts) {
    const item = toBomItem(part, built.config || {});
    const key = `${item.code}::${item.lookupTag}`;
    const current = rows.get(key);
    if (current) {
      if (part.type !== 'kit_fuente') {
        current.qty += 1;
        current.cantidad += 1;
      }
    } else {
      rows.set(key, item);
    }
  }
  return Array.from(rows.values());
}

export function generateKuoAVBOM(config = {}) {
  return buildKuoAVBOM(buildKuoAV(config));
}

export default generateKuoAVBOM;
