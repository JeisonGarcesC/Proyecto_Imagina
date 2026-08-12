const milaCache = { items: null };

export async function loadMilaItems() {
  if (milaCache.items) return milaCache.items;

  try {
    const response = await fetch('/assets/models/Mila/mila.json');
    if (!response.ok) throw new Error('No se pudo cargar Mila');

    const data = await response.json();
    const list = Array.isArray(data) ? data : data.items || [];

    const items = list.map((item, index) => ({
      id: item.id || `mila-${index + 1}`,
      codigoPT: item.codigoPT || item.codigo || item.code || `MILA_${String(index + 1).padStart(3, '0')}`,
      title: item.title || item.name || 'Producto Mila',
      subtitle: item.subtitle || item.description || 'Elemento de librería Mila',
      modelSrc: item.modelSrc || '/assets/models/Mila/placeholder.glb',
      raw: item,
    }));

    milaCache.items = items;
    return items;
  } catch (error) {
    console.warn('[loadMilaItems] No se pudieron cargar los productos Mila:', error);
    return [];
  }
}
