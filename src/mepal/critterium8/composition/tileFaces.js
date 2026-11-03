// Existing material catalog (gen-esp_3.xml): Formica Natural Elm Mate 1499, 4 × 8.
export const CRITTERIUM8_DEFAULT_TILE_MATERIAL_CODE = '22015170';
export const CRITTERIUM8_DEFAULT_TILE_MATERIAL_RGB = '205_183_160';

export function normalizeCritterium8TileFaces(tile = {}) {
  const legacy = {
    enabled: true,
    materialCode: tile.materialCode ?? null,
    finishCode: tile.finishCode ?? null,
    rgbValue: tile.rgbValue ?? null,
  };
  const faces = tile.faces;
  if (!faces || typeof faces !== 'object') return { FRONT: { ...legacy }, BACK: { ...legacy } };
  return Object.fromEntries(['FRONT', 'BACK'].map((face) => [face, {
    ...legacy,
    ...(faces[face] || {}),
    enabled: faces[face]?.enabled !== false,
  }]));
}

