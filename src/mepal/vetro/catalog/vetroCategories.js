export const VETRO_FAMILY = 'VETRO';

export const VETRO_CATEGORIES = Object.freeze([
  { id: 'PANELS', label: 'Paneles' },
  { id: 'DOORS', label: 'Puertas', children: [{ id: 'DOOR_LEAF', label: 'Nave puerta' }, { id: 'DOOR_FRAME', label: 'Marco puerta' }] },
  { id: 'JUNCTION_KITS', label: 'Kits de unión' },
  { id: 'PROFILES', label: 'Perfiles', children: [{ id: 'VERTICAL', label: 'Verticales' }, { id: 'HORIZONTAL', label: 'Horizontales' }] },
  { id: 'ACCESSORIES', label: 'Accesorios' },
]);

