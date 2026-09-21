import { lockerDocumentedCatalog } from './lockerDocumentedCatalog.js';

export const LOCKER_COLUMNS = Object.freeze({ INDIVIDUAL: 1, DOBLE: 2, TRIPLE: 3 });
export const lockerBodyCatalog = lockerDocumentedCatalog.filter(r => r.description.startsWith('CUERPO')).map(r => {
  const [, h, w, d] = r.description.match(/(\d+)X(\d+)X(\d+)CM/);
  return { ...r, widthMm: Number(w) * 10, depthMm: Number(d) * 10, heightMm: Number(h) * 10 };
});
export const lockerBayCatalog = lockerDocumentedCatalog.filter(r => r.type?.includes('NAVE')).map(r => ({
  ...r, bayCount: Number(r.type[0]), modality: r.material === 'METALICA_EMBEBIDA' ? 'EMBEBIDA' : 'PARCHE',
}));
export const lockerAccessoryCatalog = lockerDocumentedCatalog.filter(r => !r.type);
export const lockerCategories = [
  ['BODY', 'Corazas'], ['BAYS', 'Naves'], ['SHELVES', 'Entrepaños'], ['PLINTH', 'Zócalos'],
  ['HANDLES', 'Manijas'], ['SECURITY', 'Cerraduras / seguridad'], ['ACCESSORIES', 'Accesorios'],
];
export const commercialOptions = Object.freeze({ heightsMm: [1800, 2200], depthsMm: [500],
  widthsMm: { INDIVIDUAL: [500], DOBLE: [800, 1000], TRIPLE: [1000] } });
export const technicalRange = Object.freeze({ heightMm: [1650, 2200], depthMm: [300, 500],
  widthMm: { INDIVIDUAL: [300, 500], DOBLE: [600, 1000], TRIPLE: [900, 1000] } });
