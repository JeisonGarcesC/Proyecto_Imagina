export const CRITTERIUM8_TILE_PROJECTION_MM = 15;

const STANDARD_WIDTHS = Object.freeze([30, 45, 60, 75, 90, 120]);
const WIDE_WIDTHS = Object.freeze([...STANDARD_WIDTHS, 150]);

export const CRITTERIUM8_FORMICA_FULL_TILE_HEIGHTS_CM = Object.freeze([38, 76, 114, 152, 190]);

export const CRITTERIUM8_TILE_CATALOG = Object.freeze({
  FORMICA: { displayName: 'Baldosa fórmica', allowedHeightsCm: [16, 20, 22, 38, 76, 114, 152, 190], allowedWidthsCm: STANDARD_WIDTHS, tileProjectionMm: 15 },
  METAL_SMOOTH: { displayName: 'Baldosa metálica lisa', allowedHeightsCm: [16, 20, 22, 38, 76], allowedWidthsCm: STANDARD_WIDTHS, tileProjectionMm: 15 },
  METAL_PERFORATED: { displayName: 'Baldosa metálica perforada', allowedHeightsCm: [16, 20, 22, 38, 76], allowedWidthsCm: STANDARD_WIDTHS, tileProjectionMm: 15 },
  METAL_EMBOSSED: { displayName: 'Baldosa metálica repujada', allowedHeightsCm: [16, 20, 22, 38, 76], allowedWidthsCm: STANDARD_WIDTHS, tileProjectionMm: 15 },
  GLASS: { displayName: 'Baldosa vidrio', allowedHeightsCm: [38, 76], allowedWidthsCm: WIDE_WIDTHS, widthHeightRestrictions: { 150: [38] }, tileProjectionMm: 15 },
  DOCUMENT_PASS: { displayName: 'Baldosa pasadocumentos / pasavoz', allowedHeightsCm: [38], allowedWidthsCm: [114.5, 144.5, 174.5], tileProjectionMm: 15 },
  SINGLE_GLASS: { displayName: 'Baldosa un vidrio', allowedHeightsCm: [38, 76, 114, 152, 190], allowedWidthsCm: STANDARD_WIDTHS, tileProjectionMm: 15 },
  ACOUSTIC: { displayName: 'Baldosa acústica', allowedHeightsCm: [38], allowedWidthsCm: WIDE_WIDTHS, tileProjectionMm: 15 },
  FABRIC: { displayName: 'Baldosa tela', allowedHeightsCm: [20, 22, 38, 76, 114, 152, 190], allowedWidthsCm: WIDE_WIDTHS, tileProjectionMm: 15 },
  PORT: { displayName: 'Baldosa puerto', allowedHeightsCm: [16, 38], allowedWidthsCm: [60, 75, 90, 120, 150], tileProjectionMm: 15 },
  PLINTH_COVER: { displayName: 'Tapa zócalo lisa', allowedHeightsCm: [16], allowedWidthsCm: [30, 45, 60, 75, 90, 120, 150], tileProjectionMm: null },
  PLINTH_OUTLET: { displayName: 'Tapa zócalo toma', allowedHeightsCm: [16], allowedWidthsCm: [60, 75, 90, 120, 150], tileProjectionMm: null },
});

export const CRITTERIUM8_FORMICA_CODE_CATALOG = Object.freeze([
  { code: '22191302082', heightCm: 20, widthCm: 30 },
  { code: '22191302083', heightCm: 20, widthCm: 45 },
  { code: '22191302084', heightCm: 20, widthCm: 60 },
  { code: '22191302085', heightCm: 20, widthCm: 75 },
  { code: '22191302086', heightCm: 20, widthCm: 90 },
  { code: '22191302088', heightCm: 20, widthCm: 120 },
  { code: '22191302064', heightCm: 22, widthCm: 60 },
  { code: '22191302071', heightCm: 22, widthCm: 75 },
  { code: '22191302072', heightCm: 22, widthCm: 90 },
  { code: '22191302074', heightCm: 22, widthCm: 120 },
  { code: '22191301836', heightCm: 38, widthCm: 30 },
  { code: '22191301837', heightCm: 38, widthCm: 45 },
  { code: '22191301822', heightCm: 38, widthCm: 60 },
  { code: '22191301838', heightCm: 38, widthCm: 75 },
  { code: '22191301823', heightCm: 38, widthCm: 90 },
  { code: '22191301839', heightCm: 38, widthCm: 120 },
  { code: '22191402428', heightCm: 76, widthCm: 30 },
  { code: '22191402430', heightCm: 76, widthCm: 60 },
  { code: '22191402431', heightCm: 76, widthCm: 75 },
  { code: '22191402432', heightCm: 76, widthCm: 90 },
  { code: '22191402434', heightCm: 76, widthCm: 120 },
  { code: '22191701979', heightCm: 114, widthCm: 30 },
  { code: '22191701980', heightCm: 114, widthCm: 60 },
  { code: '22191701981', heightCm: 114, widthCm: 75 },
  { code: '22191701982', heightCm: 114, widthCm: 90 },
  { code: '22191701983', heightCm: 114, widthCm: 120 },
  { code: '22191900768', heightCm: 152, widthCm: 30 },
  { code: '22191900769', heightCm: 152, widthCm: 60 },
  { code: '22191900770', heightCm: 152, widthCm: 75 },
  { code: '22191900771', heightCm: 152, widthCm: 90 },
  { code: '22191900772', heightCm: 152, widthCm: 120 },
  { code: '22191900758', heightCm: 190, widthCm: 30 },
  { code: '22191900759', heightCm: 190, widthCm: 60 },
  { code: '22191900760', heightCm: 190, widthCm: 75 },
  { code: '22191900761', heightCm: 190, widthCm: 90 },
  { code: '22191900762', heightCm: 190, widthCm: 120 },
].map(Object.freeze));

// Exact commercial rows from the CRITTERIUM 8 documents. Every row below has
// a matching product description in PriceList_CO_2.xml.
// These rows are separate from the legacy physical-part code catalog above.
const commercialRow = (tileType, heightCm, widthCm, code, criteria = {}, source = 'PRICELIST_CO_XML') =>
  Object.freeze({ tileType, heightCm, widthCm, code, criteria: Object.freeze(criteria), source });
const commercialGrid = (tileType, heightCm, widths, codes, criteria = {}) =>
  widths.map((widthCm, index) => commercialRow(tileType, heightCm, widthCm, codes[index], criteria));

export const CRITTERIUM8_TILE_COMMERCIAL_CATALOG = Object.freeze([
  commercialRow('FABRIC', 38, 90, '22191200878', { gama: '1', fabricType: 'HILAT' }, 'MAPA_PRODUCTO+XML+CONFIRMACION_USUARIO'),
  ...commercialGrid('FORMICA', 20, [30, 45], ['22191302082', '22191302083'], { subtype: 'MADERA' }),
  ...commercialGrid('FORMICA', 20, [60, 75, 90, 120], ['22191302084', '22191302085', '22191302086', '22191302088']),
  ...commercialGrid('FORMICA', 38, [30, 45, 60], ['22191301836', '22191301837', '22191301822']),
  ...commercialGrid('FORMICA', 38, [75, 90, 120], ['22191301838', '22191301823', '22191301839'], { subtype: 'FORMICA' }),
  ...commercialGrid('FORMICA', 38, [75, 90, 120], ['22191402406', '22191402407', '22191402409'], { subtype: 'PIZARRON' }, 'XML'),
  ...commercialGrid('FORMICA', 76, [30, 45, 60, 75, 90, 120], ['22191402428', '22191402429', '22191402430', '22191402431', '22191402432', '22191402434'], { subtype: 'ANTEPECHO' }),
  ...commercialGrid('FORMICA', 76, [30, 60, 75, 90, 120], ['22191900763', '22191900764', '22191900765', '22191900766', '22191900767'], { subtype: 'ENTERIZA' }),
  ...commercialGrid('FORMICA', 114, [30, 60, 75, 90, 120], ['22191701979', '22191701980', '22191701981', '22191701982', '22191701983'], { subtype: 'ENTERIZA' }),
  ...commercialGrid('FORMICA', 152, [30, 60, 75, 90, 120], ['22191900768', '22191900769', '22191900770', '22191900771', '22191900772'], { subtype: 'ENTERIZA' }),
  ...commercialGrid('FORMICA', 190, [30, 60, 75, 90, 120], ['22191900758', '22191900759', '22191900760', '22191900761', '22191900762'], { subtype: 'ENTERIZA' }),
  ...commercialGrid('METAL_PERFORATED', 38, [30, 45, 60, 75, 90, 120], ['22191401912', '22191401913', '22191401914', '22191401915', '22191401916', '22191401918'], { metalPattern: 'CUADRADOS' }),
  ...commercialGrid('METAL_PERFORATED', 38, [30, 45, 60, 75, 90, 120], ['22191402602', '22191402603', '22191402604', '22191402605', '22191402606', '22191402608'], { metalPattern: 'CIRCULOS' }),
  ...commercialGrid('METAL_EMBOSSED', 38, [30, 45, 60, 75, 90, 120], ['22191401886', '22191401887', '22191401888', '22191401889', '22191401890', '22191401910'], { metalPattern: 'CUADRADOS' }),
  ...commercialGrid('METAL_EMBOSSED', 38, [30, 45, 60, 75, 90, 120], ['22191401930', '22191401931', '22191401932', '22191401933', '22191401934', '22191401936'], { metalPattern: 'CIRCULOS' }),
  ...commercialGrid('METAL_EMBOSSED', 76, [30, 45, 60, 75, 90, 120], ['22191402787', '22191402788', '22191402789', '22191402790', '22191402791', '22191402793'], { metalPattern: 'CUADRADOS' }),
  ...commercialGrid('METAL_EMBOSSED', 76, [30, 45, 60, 75, 90, 120], ['22191402771', '22191402772', '22191402773', '22191402774', '22191402775', '22191402777'], { metalPattern: 'CIRCULOS' }),
  ...commercialGrid('PORT', 16, [60, 75, 90, 120, 150], ['22191402666', '22191402667', '22191402668', '22191402670', '22191402671']),
  ...commercialGrid('PORT', 38, [60, 75, 90, 120, 150], ['22191302108', '22191302109', '22191302110', '22191302112', '22191401207']),
  ...commercialGrid('SINGLE_GLASS', 76, [30, 45, 60, 75, 90, 120], ['22191900777', '22191900778', '22191900779', '22191900780', '22191900781', '22191900783'], { glassType: 'UN_VIDRIO', glassThicknessMm: 4, glassColor: 'BRONCE' }),
  ...commercialGrid('SINGLE_GLASS', 114, [30, 60, 75, 90, 120], ['22191900436', '22191900365', '22191900366', '22191900367', '22191900368'], { glassType: 'UN_VIDRIO', glassThicknessMm: 4, glassColor: 'BRONCE' }),
  ...commercialGrid('SINGLE_GLASS', 152, [30, 45, 60, 75, 90, 120], ['22191900579', '22191900580', '22191900581', '22191900582', '22191900583', '22191900585'], { glassType: 'UN_VIDRIO', glassThicknessMm: 4, glassColor: 'BRONCE' }),
]);

// Preserve only previously chosen values that still occur in an exact catalog
// row after a tile type or frame dimension changes. No value is selected here.
export function retainCritterium8TileCommercialOptions({ tileType, widthCm, heightCm, commercialOptions } = {}) {
  if (!commercialOptions || typeof commercialOptions !== 'object' || Array.isArray(commercialOptions)) return undefined;
  const rows = CRITTERIUM8_TILE_COMMERCIAL_CATALOG.filter((entry) =>
    entry.tileType === String(tileType || '').trim().toUpperCase()
    && entry.widthCm === Number(widthCm)
    && entry.heightCm === Number(heightCm)
  );
  let compatibleRows = rows;
  const retained = {};
  for (const [key, value] of Object.entries(commercialOptions)) {
    const matches = compatibleRows.filter((entry) =>
      Object.hasOwn(entry.criteria, key)
      && (value == null || String(entry.criteria[key]).trim().toUpperCase() === String(value).trim().toUpperCase())
    );
    if (!matches.length) continue;
    retained[key] = value;
    if (value != null) compatibleRows = matches;
  }
  return retained;
}

export function getCritterium8TileType(type) {
  return CRITTERIUM8_TILE_CATALOG[String(type || '').trim().toUpperCase()] || null;
}
