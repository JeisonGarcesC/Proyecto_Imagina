import { buildCritterium8FrameComposition } from './frameComposition.js';
import { CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE, CRITTERIUM8_DEFAULT_TILE_MATERIAL_RGB } from './tileFaces.js';
import { defaultCritterium8FormicaCommercialOptions } from '../catalog/tileCatalog.js';

export function createDefaultCritterium8Tiles(frame = {}) {
  const composition = buildCritterium8FrameComposition({ ...frame, tiles: [] });
  return composition.tileSlots.map((slot) => ({
    slotId: slot.id,
    tileType: 'FORMICA',
    heightCm: slot.heightCm,
    ...(defaultCritterium8FormicaCommercialOptions({ widthCm: frame.widthCm, heightCm: slot.heightCm })
      ? { commercialOptions: { subtype: 'FORMICA' } } : {}),
    faces: {
      FRONT: { enabled: true, materialCode: CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE, rgbValue: CRITTERIUM8_DEFAULT_TILE_MATERIAL_RGB },
      BACK: { enabled: true, materialCode: CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE, rgbValue: CRITTERIUM8_DEFAULT_TILE_MATERIAL_RGB },
    },
  }));
}
