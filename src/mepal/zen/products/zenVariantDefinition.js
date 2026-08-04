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
    disabled: baseCode !== '22000020563',
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
