import { MULTIPLE_COMMERCIAL_CATALOG } from './multipleCommercialCatalog.generated.js';
export const MULTIPLE_ACCESSORY_COMMERCIAL_CATALOG = Object.freeze(MULTIPLE_COMMERCIAL_CATALOG.filter((entry) => ['ACCESSORY', 'CABLE_MANAGEMENT'].includes(entry.type)));
