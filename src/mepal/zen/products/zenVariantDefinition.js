const ZEN_CUSHION_ADDON = Object.freeze({
  code: '22000008239',
  qty: 1,
  description: 'Cushion',
});

const ZEN_LAMINATE_ADDON = Object.freeze({
  code: '22000007233',
  qty: 1,
  description: 'Laminate',
});

const ZEN_VARIANT_GROUPS = Object.freeze([
  ...[
    '22000020026',
    '22000020028',
    '22000020029',
    '22000020051',
    '22000020055',
    '22000020059',
    '22000020067',
    '22000020069',
    '22000020071',
  ].map((baseCode) => ({
    baseCode,
    category: 'Biblioteca',
    variantType: 'lamiante',
    variantSuffix: '_lamiante',
    disabled: baseCode === '22000020071',
  })),
  ...[
    '22000020563',
    '22000020564',
    '22000020565',
    '22000020575',
    '22000020576',
    '22000020577',
    '22000033305',
  ].map((baseCode) => ({
    baseCode,
    category: 'Pedestal',
    variantType: 'cushion',
    variantSuffix: baseCode === '22000020564' ? '__cushion' : '_cushion',
    disabled: false,
  })),
]);

function normalizeInputCode(code) {
  const value = String(code || '')
    .trim()
    .replace(/\\/g, '/');
  const filename = value.slice(value.lastIndexOf('/') + 1);
  return filename.replace(/\.glb$/i, '').toLowerCase();
}

function getGroupByCode(code) {
  const normalized = normalizeInputCode(code);
  const baseCode = normalizeZenVariantCode(normalized);
  return ZEN_VARIANT_GROUPS.find((group) => group.baseCode === baseCode) || null;
}

function resolveRequestedVariant(code, group) {
  const normalized = normalizeInputCode(code);
  if (normalized === group.baseCode) return 'base';
  if (/_+cushion$/.test(normalized)) return 'cushion';
  if (/_+(?:lamiante|laminate)$/.test(normalized)) return 'lamiante';
  return null;
}

function createVariantOption(group, variantType) {
  const isBase = variantType === 'base';
  const suffix = isBase ? '' : group.variantSuffix;
  const variantCode = `${group.baseCode}${suffix}`;
  const addons =
    variantType === 'cushion'
      ? [ZEN_CUSHION_ADDON]
      : variantType === 'lamiante'
        ? [ZEN_LAMINATE_ADDON]
        : [];

  return {
    baseCode: group.baseCode,
    variantCode,
    variantType,
    variant: isBase ? null : variantType,
    label: isBase ? 'Base' : variantType === 'cushion' ? 'Cushion' : 'Lamiante',
    category: group.category,
    modelSource: `/assets/models/Almacenamiento/${group.category}/${variantCode}.glb`,
    addons: addons.map((addon) => ({ ...addon })),
    disabled: group.disabled,
  };
}

export function normalizeZenVariantCode(code) {
  return normalizeInputCode(code).replace(/_+(?:cushion|lamiante|laminate)$/i, '');
}

export function getZenVariantByCode(code) {
  const group = getGroupByCode(code);
  if (!group) return null;

  const variantType = resolveRequestedVariant(code, group);
  if (!variantType) return null;

  if (variantType !== 'base' && variantType !== group.variantType) return null;
  return createVariantOption(group, variantType);
}

export function getZenVariantOptionsByCode(code) {
  const group = getGroupByCode(code);
  if (!group) return null;

  return [createVariantOption(group, 'base'), createVariantOption(group, group.variantType)];
}

export function isZenVariantCode(code) {
  return getZenVariantByCode(code) !== null;
}

// ==========================================
// FAMILIAS ESCALABLES (Zen Almacenamiento - Bibliotecas)
// ==========================================

export const ZEN_BIBLIOTECA_FAMILIES = Object.freeze([
  {
    id: 'ALM_LATERAL_FORMICA_MANIJA',
    name: 'Archivador lateral 2 gavetas frente formica con manija',
    min: 60,
    max: 90,
    step: 10,
    code60: '22000020026',
    code90: '22000020025',
    dimensionPattern: '71X{LEN}X50CM',
  },
  {
    id: 'ALM_LATERAL_METALICO_MANIJA',
    name: 'Archivador lateral 2 gavetas frente metálico con manija',
    min: 60,
    max: 90,
    step: 10,
    code60: '22000020028',
    code90: '22000020027',
    dimensionPattern: '71X{LEN}X50CM',
  },
  {
    id: 'ALM_LATERAL_METALICO_EMBEBIDA',
    name: 'Archivador lateral 2 gavetas frente metálico manija embebida',
    min: 60,
    max: 90,
    step: 10,
    code60: '22000020029',
    code90: '22000020030',
    dimensionPattern: '71X{LEN}X50CM',
  },
  {
    id: 'ALM_BIBLIOTECA_1E_PUERTA_FORMICA_MANIJA',
    name: 'Biblioteca metálica 1 entrepaño con puerta formica con manija',
    min: 60,
    max: 90,
    step: 10,
    code60: '22000020051',
    code90: '22000020052',
    dimensionPattern: '71X{LEN}X50CM',
  },
  {
    id: 'ALM_BIBLIOTECA_1E_PUERTA_METALICO_MANIJA',
    name: 'Biblioteca metálica 1 entrepaño con puerta metálico con manija',
    min: 60,
    max: 90,
    step: 10,
    code60: '22000020055',
    code90: '22000020056',
    dimensionPattern: '71X{LEN}X50CM',
  },
  {
    id: 'ALM_BIBLIOTECA_1E_PUERTA_METALICA',
    name: 'Biblioteca metálica 1 entrepaño con puerta metálica',
    min: 60,
    max: 90,
    step: 10,
    code60: '22000020059',
    code90: '22000020060',
    dimensionPattern: '71X{LEN}X50CM',
  },
  {
    id: 'ALM_BIBLIOTECA_2E_SIN_PUERTA',
    name: 'Biblioteca metálica 2 entrepaños sin puerta',
    min: 60,
    max: 90,
    step: 10,
    code60: '22000020067',
    code90: '22000020068',
    dimensionPattern: '101X{LEN}X50CM',
  },
  {
    id: 'ALM_BIBLIOTECA_1E_SIN_PUERTA',
    name: 'Biblioteca metálica 1 entrepaño sin puerta',
    min: 60,
    max: 90,
    step: 10,
    code60: '22000020069',
    code90: '22000020070',
    dimensionPattern: '71X{LEN}X50CM',
  },
]);

const BIBLIOTECA_CODE_MAP = new Map();
for (const family of ZEN_BIBLIOTECA_FAMILIES) {
  BIBLIOTECA_CODE_MAP.set(family.code60, family);
  BIBLIOTECA_CODE_MAP.set(family.code90, family);
}

export function getZenBibliotecaFamily(code) {
  const norm = normalizeZenVariantCode(code);
  return BIBLIOTECA_CODE_MAP.get(norm) || null;
}

export function isZenBibliotecaCode(code) {
  return getZenBibliotecaFamily(code) !== null;
}

export const ZEN_STANDARD_DIMENSION_OPTIONS = Object.freeze([
  { value: 60, label: '0.60 m' },
  { value: 90, label: '0.90 m' },
]);

/**
 * Resuelve el tier de facturación según la regla de techo (precio máximo del rango):
 * 60 cm se factura con el precio de 60 cm.
 * A partir de 70 cm (70, 80, 90 cm), se factura al precio de 90 cm.
 */
export function resolveZenBillingTier(family, lengthCm) {
  if (!family) return null;
  const len = Number(lengthCm || 60);
  if (len <= 60) {
    return {
      code: family.code60,
      lengthCm: 60,
    };
  }
  return {
    code: family.code90,
    lengthCm: 90,
  };
}

/**
 * Retorna las opciones de medida especial de 10 en 10 cm (60, 70, 80, 90 cm)
 * con la indicación del rango de facturación correspondiente.
 */
export function getZenSpecialDimensionOptions(code) {
  const family = getZenBibliotecaFamily(code);
  if (!family) return [];
  const options = [];
  for (let l = family.min; l <= family.max; l += family.step) {
    const billing = resolveZenBillingTier(family, l);
    const isStandard = l === 60 || l === 90;
    const label = isStandard
      ? `${l} cm`
      : `${l} cm (Precio: ${billing.lengthCm} cm)`;
    options.push({
      value: l,
      label,
      billingCode: billing.code,
      billingLengthCm: billing.lengthCm,
      isStandard,
    });
  }
  return options;
}

