const profiles = [
  ...[
    [204, '22000017673', '22000104807'], [242, '22000017674', '22000104808'],
    [280, '22000017675', '22000104809'], [318, '22000017676', '22000123330'],
  ].flatMap(([length, anodized, painted]) => [
    { category: 'PROFILES', subcategory: 'VERTICAL', productType: 'PROFILE', variant: 'WALL_ARRIVAL_KIT', label: 'Kit llegada a pared', reference: 'VTAC230000', nominalLengthCm: length, dimensionsCm: { width: 5.7, height: length, depth: 2.5 }, finish: 'ANODIZED', code: anodized },
    { category: 'PROFILES', subcategory: 'VERTICAL', productType: 'PROFILE', variant: 'WALL_ARRIVAL_KIT', label: 'Kit llegada a pared', reference: 'VTAC230000', nominalLengthCm: length, dimensionsCm: { width: 5.7, height: length, depth: 2.5 }, finish: 'PAINTED', code: painted },
  ]),
  { category: 'PROFILES', subcategory: 'VERTICAL', productType: 'PROFILE', variant: 'SQUARE_COLUMN', label: 'Columna cuadrada aluminio', reference: 'VTES010365', nominalLengthCm: 600, dimensionsCm: { width: 6, height: 600, depth: 6 }, finish: 'ANODIZED', code: '22000119694' },
  { category: 'PROFILES', subcategory: 'VERTICAL', productType: 'PROFILE', variant: 'SQUARE_COLUMN', label: 'Columna cuadrada aluminio', reference: 'VTES010365', nominalLengthCm: 600, dimensionsCm: { width: 6, height: 600, depth: 6 }, finish: 'PAINTED', code: '22000122199' },
  ...[
    ['TOP_KIT', 'Kit superior', 'VTAC210000', 300, '22000017629', '22000104819'],
    ['TOP_KIT', 'Kit superior', 'VTAC210000', 600, '22000017631', '22000104820'],
    ['PLINTH_KIT', 'Kit zocalo', 'VTAC220000', 300, '22000017630', '22000104817'],
    ['PLINTH_KIT', 'Kit zocalo', 'VTAC220000', 600, '22000017632', '22000104818'],
  ].flatMap(([variant, label, reference, length, anodized, painted]) => [
    { category: 'PROFILES', subcategory: 'HORIZONTAL', productType: 'PROFILE', variant, label, reference, nominalLengthCm: length, dimensionsCm: { width: 6, height: length, depth: 6 }, finish: 'ANODIZED', code: anodized },
    { category: 'PROFILES', subcategory: 'HORIZONTAL', productType: 'PROFILE', variant, label, reference, nominalLengthCm: length, dimensionsCm: { width: 6, height: length, depth: 6 }, finish: 'PAINTED', code: painted },
  ]),
  { category: 'PROFILES', subcategory: 'HORIZONTAL', productType: 'PROFILE', variant: 'FLOOR_ARRIVAL_PROFILE', label: 'Perfil llegada piso Vetro', reference: 'VTAC010001', nominalLengthCm: 300, dimensionsCm: { width: 2, height: 300, depth: 4.6 }, finish: null, code: '22000011980' },
  { category: 'PROFILES', subcategory: 'HORIZONTAL', productType: 'PROFILE', variant: 'FLOATING_ALUMINUM_PROFILE', label: 'Perfil flotante aluminio', reference: 'VTAC020000', nominalLengthCm: 300, dimensionsCm: { width: 4, height: 300, depth: 7.7 }, finish: null, code: '22000011003' },
  { category: 'PROFILES', subcategory: 'HORIZONTAL', productType: 'PROFILE', variant: 'FLOATING_ALUMINUM_PROFILE', label: 'Perfil flotante aluminio', reference: 'VTAC020000', nominalLengthCm: 600, dimensionsCm: { width: 4, height: 600, depth: 7.7 }, finish: null, code: '22000011004' },
];
export const VETRO_PROFILE_CODE_CATALOG = Object.freeze(profiles.map(Object.freeze));
