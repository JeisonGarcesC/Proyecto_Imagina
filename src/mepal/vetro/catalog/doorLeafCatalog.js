export const VETRO_DOOR_LEAF_VARIANTS = Object.freeze({
  SINGLE: { label: 'Nave puerta sencilla', reference: 'VTPT010000', nominalWidthCm: 90 },
  DOUBLE: { label: 'Nave puerta doble', reference: 'VTPT030000', nominalWidthCm: 180 },
});
export const VETRO_DOOR_LEAF_HEIGHTS_CM = Object.freeze([204, 242, 280, 318]);
const codes = {
  SINGLE: { 204: '22000010922', 242: '22000010923', 280: '22000010924', 318: '22000010925' },
  DOUBLE: { 204: '22000032909', 242: '22000032910', 280: '22000032911', 318: '22000032912' },
};
export const VETRO_DOOR_LEAF_CODE_CATALOG = Object.freeze(
  Object.entries(codes).flatMap(([variant, heights]) => Object.entries(heights).map(([nominalHeightCm, code]) => Object.freeze({
    category: 'DOORS', subcategory: 'DOOR_LEAF', productType: 'DOOR_LEAF', variant,
    reference: VETRO_DOOR_LEAF_VARIANTS[variant].reference,
    nominalWidthCm: VETRO_DOOR_LEAF_VARIANTS[variant].nominalWidthCm,
    nominalHeightCm: Number(nominalHeightCm), material: 'TEMPERED_GLASS_10MM', code,
  })))
);

