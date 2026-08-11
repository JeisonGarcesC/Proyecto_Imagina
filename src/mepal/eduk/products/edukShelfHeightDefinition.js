export const EDUK_VARIANT_GROUPS = [
  {
    id: 'eduk_shelf_01',
    properties: [
      {
        key: 'height',
        label: 'Altura',
        options: [
          { value: '114cm', label: '114cm' },
          { value: '174cm', label: '174cm' },
        ],
      },
    ],
    variants: [
      { code: '22192002000', height: '114cm' },
      { code: '22192002001', height: '174cm' },
    ],
  },
  {
    id: 'eduk_shelf_02',
    properties: [
      {
        key: 'height',
        label: 'Altura',
        options: [
          { value: '114cm', label: '114cm' },
          { value: '174cm', label: '174cm' },
        ],
      },
    ],
    variants: [
      { code: '22192002002', height: '114cm' },
      { code: '22192002003', height: '174cm' },
    ],
  },
  {
    id: 'eduk_shelf_03',
    properties: [
      {
        key: 'height',
        label: 'Altura',
        options: [
          { value: '114cm', label: '114cm' },
          { value: '174cm', label: '174cm' },
        ],
      },
    ],
    variants: [
      { code: '22192002004', height: '114cm' },
      { code: '22192002005', height: '174cm' },
    ],
  },
  {
    id: 'eduk_table_01',
    properties: [
      {
        key: 'width',
        label: 'Ancho',
        options: [
          { value: '70cm', label: '70cm' },
          { value: '80cm', label: '80cm' },
          { value: '130cm', label: '130cm' },
        ],
      },
    ],
    variants: [
      { code: '22000042972', width: '70cm' },
      { code: '22000110052', width: '80cm' },
      { code: '22000042974', width: '130cm' },
    ],
  },
  {
    id: 'eduk_table_02',
    properties: [
      {
        key: 'width',
        label: 'Ancho',
        options: [
          { value: '80cm', label: '80cm' },
          { value: '100cm', label: '100cm' },
        ],
      },
    ],
    variants: [
      { code: '22000122175', width: '80cm' },
      { code: '22000122174', width: '100cm' },
    ],
  },
  {
    id: 'eduk_table_03_toma',
    properties: [
      {
        key: 'width',
        label: 'Ancho',
        options: [
          { value: '90cm', label: '90cm' },
          { value: '120cm', label: '120cm' },
          { value: '150cm', label: '150cm' },
        ],
      },
      {
        key: 'toma',
        label: 'Toma',
        options: [
          { value: 'si', label: 'Si' },
          { value: 'no', label: 'No' },
        ],
      },
    ],
    variants: [
      { code: '22000121578', width: '90cm', toma: 'si' },
      { code: '22000121576', width: '120cm', toma: 'si' },
      { code: '22000121577', width: '150cm', toma: 'si' },
      { code: '22000121190', width: '90cm', toma: 'no' },
      { code: '22000121163', width: '120cm', toma: 'no' },
      { code: '22000121164', width: '150cm', toma: 'no' },
    ],
  },
];

const EDUK_GROUPS_BY_ID = new Map(EDUK_VARIANT_GROUPS.map((group) => [group.id, group]));

const EDUK_GROUP_ID_BY_CODE = new Map(
  EDUK_VARIANT_GROUPS.flatMap((group) =>
    (group.variants || []).map((variant) => [variant.code, group.id])
  )
);

const EDUK_VARIANT_BY_CODE = new Map(
  EDUK_VARIANT_GROUPS.flatMap((group) =>
    (group.variants || []).map((variant) => [variant.code, variant])
  )
);

export function normalizeEdukCode(value) {
  return String(value || '').trim();
}

export function getEdukVariantGroupByCode(code) {
  const normalizedCode = normalizeEdukCode(code);
  const groupId = EDUK_GROUP_ID_BY_CODE.get(normalizedCode);
  if (!groupId) return null;
  return EDUK_GROUPS_BY_ID.get(groupId) || null;
}

export function getEdukVariantByCode(code) {
  return EDUK_VARIANT_BY_CODE.get(normalizeEdukCode(code)) || null;
}

export function resolveEdukCodeBySelection(code, nextSelection = {}) {
  const group = getEdukVariantGroupByCode(code);
  const currentVariant = getEdukVariantByCode(code);
  if (!group || !currentVariant) return null;

  const mergedSelection = {
    ...currentVariant,
    ...(nextSelection || {}),
  };

  const match = (group.variants || []).find((variant) =>
    (group.properties || []).every(
      (property) => String(variant[property.key]) === String(mergedSelection[property.key])
    )
  );

  return match?.code || null;
}

export function getEdukShelfHeightInfoByCode(code) {
  const variant = getEdukVariantByCode(code);
  if (!variant?.height) return null;

  const group = getEdukVariantGroupByCode(code);
  if (!group) return null;

  const h114 = (group.variants || []).find((entry) => entry.height === '114cm')?.code || null;
  const h174 = (group.variants || []).find((entry) => entry.height === '174cm')?.code || null;
  if (!h114 || !h174) return null;

  return {
    h114,
    h174,
    height: variant.height,
  };
}

export function getEdukWidthInfoByCode(code) {
  const group = getEdukVariantGroupByCode(code);
  const variant = getEdukVariantByCode(code);
  if (!group || !variant) return null;

  const widthProperty = (group.properties || []).find((property) => property.key === 'width');
  if (!widthProperty) return null;

  const widthOptions = (widthProperty.options || []).map((option) => String(option.value));
  const currentWidth = String(variant.width || '');
  const currentIndex = widthOptions.indexOf(currentWidth);

  if (!widthOptions.length || currentIndex < 0) return null;

  return {
    group,
    variant,
    widthOptions,
    currentWidth,
    currentIndex,
    toma: variant.toma || null,
  };
}

export function getEdukHeightInfoByCode(code) {
  const group = getEdukVariantGroupByCode(code);
  const variant = getEdukVariantByCode(code);
  if (!group || !variant) return null;

  const heightProperty = (group.properties || []).find((property) => property.key === 'height');
  if (!heightProperty) return null;

  const heightOptions = (heightProperty.options || []).map((option) => String(option.value));
  const currentHeight = String(variant.height || '');
  const currentIndex = heightOptions.indexOf(currentHeight);

  if (!heightOptions.length || currentIndex < 0) return null;

  return {
    group,
    variant,
    heightOptions,
    currentHeight,
    currentIndex,
  };
}