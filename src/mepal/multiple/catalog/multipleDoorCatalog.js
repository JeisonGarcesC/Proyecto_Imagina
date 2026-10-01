import { MULTIPLE_COMMERCIAL_CATALOG } from './multipleCommercialCatalog.generated.js';
export const MULTIPLE_DOOR_CATALOG = Object.freeze(MULTIPLE_COMMERCIAL_CATALOG.filter((entry) => ['DOOR_FRAME', 'DOOR_LEAF', 'DOOR_ACCESSORY'].includes(entry.type)));
export const MULTIPLE_DOOR_FRAME_COMMERCIAL_CATALOG = Object.freeze(MULTIPLE_DOOR_CATALOG.filter((entry) => entry.type === 'DOOR_FRAME'));
export const MULTIPLE_DOOR_LEAF_COMMERCIAL_CATALOG = Object.freeze(MULTIPLE_DOOR_CATALOG.filter((entry) => entry.type === 'DOOR_LEAF'));
