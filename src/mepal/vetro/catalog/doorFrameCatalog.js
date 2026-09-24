export const VETRO_DOOR_FRAME_VARIANTS = Object.freeze({
  SINGLE_WITHOUT_DUCT: { label: 'Marco puerta sencilla sin ducto', reference: 'VTMP030000', nominalWidthCm: 90, doorType: 'SINGLE', hasDuct: false },
  SINGLE_WITH_DUCT: { label: 'Marco puerta sencilla con ducto', reference: 'VTMP030000', nominalWidthCm: 90, doorType: 'SINGLE', hasDuct: true },
  DOUBLE_WITHOUT_DUCT: { label: 'Marco puerta doble sin ducto', reference: 'VTMP030000', nominalWidthCm: 180, doorType: 'DOUBLE', hasDuct: false },
  DOUBLE_WITH_DUCT: { label: 'Marco puerta doble con ducto', reference: 'VTMP030000', nominalWidthCm: 180, doorType: 'DOUBLE', hasDuct: true },
});
export const VETRO_PROFILE_FINISHES = Object.freeze({ ANODIZED: 'Anodizado', PAINTED: 'Pintado' });
const codes = {
  SINGLE_WITHOUT_DUCT: {
    204: { ANODIZED: '22000017677', PAINTED: '22000108459' }, 242: { ANODIZED: '22000017678', PAINTED: '22000104811' },
    280: { ANODIZED: '22000017679', PAINTED: '22000108461' }, 318: { ANODIZED: '22000017680', PAINTED: '22000108462' },
  },
  SINGLE_WITH_DUCT: {
    204: { ANODIZED: '22000017685', PAINTED: '22000104810' }, 242: { ANODIZED: '22000017686' },
    280: { ANODIZED: '22000017687', PAINTED: '22000104812' }, 318: { ANODIZED: '22000017688', PAINTED: '22000104813' },
  },
  DOUBLE_WITHOUT_DUCT: {
    204: { ANODIZED: '22000017681', PAINTED: '22000108463' }, 242: { ANODIZED: '22000017682', PAINTED: '22000108464' },
    280: { ANODIZED: '22000017683', PAINTED: '22000108465' }, 318: { ANODIZED: '22000017684', PAINTED: '22000108466' },
  },
  DOUBLE_WITH_DUCT: {
    204: { ANODIZED: '22000017689', PAINTED: '22000104814' }, 242: { ANODIZED: '22000017690', PAINTED: '22000104815' },
    280: { ANODIZED: '22000017691', PAINTED: '22000104816' }, 318: {},
  },
};
export const VETRO_DOOR_FRAME_CODE_CATALOG = Object.freeze(
  Object.entries(codes).flatMap(([variant, heights]) => Object.entries(heights).flatMap(([nominalHeightCm, finishes]) =>
    Object.entries(finishes).map(([finish, code]) => Object.freeze({
      category: 'DOORS', subcategory: 'DOOR_FRAME', productType: 'DOOR_FRAME', variant, finish,
      ...VETRO_DOOR_FRAME_VARIANTS[variant], nominalHeightCm: Number(nominalHeightCm), code,
    }))
  ))
);

