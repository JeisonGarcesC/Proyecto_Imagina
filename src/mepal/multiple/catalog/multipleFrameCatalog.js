export const MULTIPLE_FRAME_THICKNESS_CM = 8;

export const MULTIPLE_HALF_HEIGHTS_CM = Object.freeze([90, 110, 128, 166, 204]);
export const MULTIPLE_HALF_WIDTHS_CM = Object.freeze([30, 45, 60, 75, 90, 105, 120, 150]);
export const MULTIPLE_FLOOR_TO_CEILING_HEIGHTS_CM = Object.freeze([242, 280, 318]);
export const MULTIPLE_FLOOR_TO_CEILING_WIDTHS_CM = Object.freeze([30, 45, 60, 75, 90, 120]);

// La matriz describe el espacio comercial visible por encima del zócalo.
// No contiene medidas usadas solamente para dibujar perfiles.
export const MULTIPLE_DOCUMENTED_COMPOSITIONS = Object.freeze({
  90: Object.freeze([76]),
  110: Object.freeze([20, 76]),
  128: Object.freeze([38, 76]),
  166: Object.freeze([76, 76]),
  204: Object.freeze([38, 76, 76]),
});

export const MULTIPLE_BASEBOARD_HEIGHT_CM = 14;

export function getMultipleAllowedWidths(frameMode = 'HALF_HEIGHT') {
  return frameMode === 'FLOOR_TO_CEILING'
    ? MULTIPLE_FLOOR_TO_CEILING_WIDTHS_CM
    : MULTIPLE_HALF_WIDTHS_CM;
}

export function getMultipleAllowedHeights(frameMode = 'HALF_HEIGHT') {
  return frameMode === 'FLOOR_TO_CEILING'
    ? MULTIPLE_FLOOR_TO_CEILING_HEIGHTS_CM
    : MULTIPLE_HALF_HEIGHTS_CM;
}
import { MULTIPLE_COMMERCIAL_CATALOG } from './multipleCommercialCatalog.generated.js';

export const MULTIPLE_FRAME_COMMERCIAL_CATALOG = Object.freeze(MULTIPLE_COMMERCIAL_CATALOG.filter((entry) => entry.type === 'FRAME'));
export const MULTIPLE_BASEBOARD_COMMERCIAL_CATALOG = Object.freeze(MULTIPLE_COMMERCIAL_CATALOG.filter((entry) => entry.type === 'BASEBOARD'));
