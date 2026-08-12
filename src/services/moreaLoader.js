const moreaCache = { items: null };

export async function loadMoreaItems() {
  if (moreaCache.items) return moreaCache.items;

  try {
    const response = await fetch('/assets/models/Morea/morea.json');
    if (!response.ok) throw new Error('No se pudo cargar Morea');

    const data = await response.json();
    const list = Array.isArray(data) ? data : data.items || [];

    const items = list.map((item, index) => ({
      id: item.id || `morea-${index + 1}`,
      codigoPT: item.codigoPT || item.codigo || item.code || `MOREA_${String(index + 1).padStart(3, '0')}`,
      title: item.title || item.name || 'Producto Morea',
      subtitle: item.subtitle || item.description || 'Elemento de librería Morea',
      modelSrc: item.modelSrc || '/assets/models/Morea/placeholder.glb',
      raw: item,
    }));

    moreaCache.items = items;
    return items;
  } catch (error) {
    console.warn('[loadMoreaItems] No se pudieron cargar los productos Morea:', error);
    return [];
  }
}
