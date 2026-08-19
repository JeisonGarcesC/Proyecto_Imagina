export const CRITTERIUM8_FAMILY = 'CRITTERIUM_8';
export const CRITTERIUM8_FRAME_THICKNESS_CM = 8;

export const CRITTERIUM8_HALF_HEIGHTS_CM = Object.freeze([90, 110, 128, 166, 204]);
export const CRITTERIUM8_DOCUMENTED_WIDTHS_CM = Object.freeze([30, 45, 60, 75, 90, 105, 120, 150]);
export const CRITTERIUM8_CODED_FRAME_WIDTHS_CM = Object.freeze([30, 45, 60, 75, 90, 120]);
export const CRITTERIUM8_FLOOR_TO_CEILING_HEIGHTS_CM = Object.freeze([242, 280, 318]);
export const CRITTERIUM8_CEILING_U_CODE = '22191200755';

const frameCodes = {
  90: { 30: '22191900000', 45: '22191900001', 60: '22191900002', 75: '22191900003', 90: '22191900004', 120: '22191900006' },
  110: { 30: '22191900222', 45: '22191900223', 60: '22191900224', 75: '22191900225', 90: '22191900226', 120: '22191900228' },
  128: { 30: '22191900007', 45: '22191900008', 60: '22191900009', 75: '22191900010', 90: '22191900011', 120: '22191900013' },
  166: { 30: '22191900014', 45: '22191900015', 60: '22191900016', 75: '22191900017', 90: '22191900018', 120: '22191900020' },
  204: { 30: '22191900021', 45: '22191900022', 60: '22191900023', 75: '22191900024', 90: '22191900025', 120: '22191900027' },
};

export const CRITTERIUM8_FRAME_CATALOG = Object.freeze(
  Object.entries(frameCodes).flatMap(([heightCm, widths]) =>
    Object.entries(widths).map(([widthCm, code]) =>
      Object.freeze({
        code,
        frameMode: 'HALF_HEIGHT',
        heightCm: Number(heightCm),
        widthCm: Number(widthCm),
        thicknessCm: CRITTERIUM8_FRAME_THICKNESS_CM,
      })
    )
  )
);

const uprightCodes = {
  242: ['22000027834', '22000027835', '22000027836', '22000027837', '22000027838', '22000027839'],
  280: ['22000027840', '22000027841', '22000027842', '22000027843', '22000027844', '22000027845'],
  318: ['22000027846', '22000027847', '22000027848', '22000027849', '22000027850', '22000027851'],
};

export const CRITTERIUM8_UPRIGHT_CATALOG = Object.freeze(
  Object.entries(uprightCodes).flatMap(([projectHeightCm, codes]) =>
    CRITTERIUM8_CODED_FRAME_WIDTHS_CM.map((widthCm, index) =>
      Object.freeze({
        code: codes[index],
        type: 'UPRIGHT_FRAME',
        baseFrameHeightCm: 204,
        projectHeightCm: Number(projectHeightCm),
        widthCm,
      })
    )
  )
);

export const CRITTERIUM8_GROWTH_MODULE_CATALOG = Object.freeze([
  { code: '22191900163', widthCm: 60, heightCm: 38 },
  { code: '22191900164', widthCm: 75, heightCm: 38 },
  { code: '22191900165', widthCm: 90, heightCm: 38 },
  { code: '22191900167', widthCm: 120, heightCm: 38 },
].map(Object.freeze));

export function getCritterium8FrameCatalogEntry({ heightCm, widthCm } = {}) {
  return CRITTERIUM8_FRAME_CATALOG.find(
    (entry) => entry.heightCm === Number(heightCm) && entry.widthCm === Number(widthCm)
  ) || null;
}

export function getCritterium8UprightCatalogEntry({ projectHeightCm, widthCm } = {}) {
  return CRITTERIUM8_UPRIGHT_CATALOG.find(
    (entry) => entry.projectHeightCm === Number(projectHeightCm) && entry.widthCm === Number(widthCm)
  ) || null;
}

export function getCritterium8GrowthModule(widthCm) {
  return CRITTERIUM8_GROWTH_MODULE_CATALOG.find((entry) => entry.widthCm === Number(widthCm)) || null;
}
