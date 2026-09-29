export const MULTIPLE_DOOR_WIDTH_CM = 90;
export const MULTIPLE_DOOR_HEIGHTS_CM = Object.freeze([90, 166, 204, 242, 280, 318]);
export const MULTIPLE_DOOR_SWINGS = Object.freeze(['RIGHT', 'LEFT']);

const doorFrames = [
  ['RIGHT', 90, '22191301985'], ['RIGHT', 166, '22191300491'], ['RIGHT', 204, '22191300567'], ['RIGHT', 242, '22191300566'],
  ['RIGHT', 280, '22191300097'], ['RIGHT', 318, '22191400046'], ['LEFT', 90, '22191301986'],
  ['LEFT', 166, '22191400080'], ['LEFT', 204, '22191400084'], ['LEFT', 242, '22191400082'],
  ['LEFT', 280, '22191400073'], ['LEFT', 318, '22191400094'],
];
export const MULTIPLE_DOOR_FRAME_CATALOG = Object.freeze(doorFrames.map(([swing, heightCm, code]) => Object.freeze({ swing, heightCm, widthCm: 90, code })));
export const MULTIPLE_DOOR_LEAF_CATALOG = Object.freeze([
  Object.freeze({ material: 'FORMICA', heightCm: 90, widthCm: 90, code: '22000011321' }),
  Object.freeze({ material: 'GLASS', heightCm: 90, widthCm: 90, code: '22191402545' }),
  Object.freeze({ material: 'GLASS', heightCm: 166, widthCm: 90, code: '22191700146' }),
  Object.freeze({ material: 'GLASS', heightCm: 204, widthCm: 90, code: '22191700148' }),
]);

export const MULTIPLE_GROWTH_TARGETS_CM = Object.freeze([242, 280, 318]);
export const MULTIPLE_COLUMN_TYPES = Object.freeze(['STRUCTURAL', 'JUNCTION']);

export const resolveMultipleDoorFrame = (door) => MULTIPLE_DOOR_FRAME_CATALOG.find((entry) => entry.swing === door.swing && entry.heightCm === door.heightCm && entry.widthCm === door.widthCm) || null;
export const resolveMultipleDoorLeaf = (door) => MULTIPLE_DOOR_LEAF_CATALOG.find((entry) => entry.material === door.material && entry.heightCm === door.heightCm && entry.widthCm === door.widthCm) || null;
