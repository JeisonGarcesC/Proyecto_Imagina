import { VETRO_JUNCTION_KIT_CATALOG } from '../catalog/junctionKitCatalog.js';
import { VETRO_ACCESSORY_CATALOG } from '../catalog/accessoryCatalog.js';

export function defaultVetroConfig(section = 'PANEL') {
  const defaults = {
    PANEL: { category: 'PANELS', productType: 'PANEL', material: 'TEMPERED_GLASS_10MM', nominalWidthCm: 30, nominalHeightCm: 204 },
    DOOR_LEAF: { category: 'DOORS', productType: 'DOOR_LEAF', variant: 'SINGLE', nominalHeightCm: 204 },
    DOOR_FRAME: { category: 'DOORS', productType: 'DOOR_FRAME', variant: 'SINGLE_WITHOUT_DUCT', nominalHeightCm: 204, finish: 'ANODIZED' },
    JUNCTION_KIT: { category: 'JUNCTION_KITS', productType: 'JUNCTION_KIT', variant: VETRO_JUNCTION_KIT_CATALOG[0].variant },
    PROFILE_VERTICAL: { category: 'PROFILES', subcategory: 'VERTICAL', productType: 'PROFILE', variant: 'WALL_ARRIVAL_KIT', nominalLengthCm: 204, finish: 'ANODIZED' },
    PROFILE_HORIZONTAL: { category: 'PROFILES', subcategory: 'HORIZONTAL', productType: 'PROFILE', variant: 'TOP_KIT', nominalLengthCm: 300, finish: 'ANODIZED' },
    ACCESSORY: { category: 'ACCESSORIES', productType: 'ACCESSORY', variant: VETRO_ACCESSORY_CATALOG[0].variant },
  };
  return { ...(defaults[section] || defaults.PANEL) };
}
