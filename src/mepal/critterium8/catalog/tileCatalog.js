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

export function getCritterium8TileType(type) {
  return CRITTERIUM8_TILE_CATALOG[String(type || '').trim().toUpperCase()] || null;
}
