export function parseXmlBom(text, projectName, Parser = globalThis.DOMParser) {
  const name = String(projectName || '').trim();
  if (!name) throw new Error('Ingresa el nombre del proyecto.');
  if (!String(text || '').trim()) throw new Error('El XML está vacío.');
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('El XML contiene declaraciones no permitidas.');
  if (typeof Parser !== 'function') throw new Error('No hay un parser XML disponible.');
  const doc = new Parser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement?.tagName !== 'DataRecords')
    throw new Error('XML mal formado o estructura distinta de DataRecords.');
  const records = Array.from(doc.documentElement.children).filter((node) => node.tagName === 'Record');
  if (!records.length) throw new Error('El XML no contiene registros Record.');
  const quantities = new Map();
  for (const [index, record] of records.entries()) {
    const field = (tag) => Array.from(record.children).find((child) => child.tagName === tag)?.textContent?.trim();
    const code = field('CODIGO_PT');
    const rawQuantity = field('CANTIDAD');
    if (!code) throw new Error(`Registro ${index + 1}: falta CODIGO_PT.`);
    if (!rawQuantity || !/^(?:\d+)(?:[.,]\d+)?$/.test(rawQuantity))
      throw new Error(`Registro ${index + 1}: CANTIDAD inválida.`);
    const qty = Number(rawQuantity.replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Registro ${index + 1}: CANTIDAD debe ser positiva.`);
    quantities.set(code, (quantities.get(code) || 0) + qty);
  }
  return { name, recordCount: records.length,
    lines: Array.from(quantities, ([code, qty]) => ({ code, qty })) };
}

export function xmlBomRows(projects, catalogByCode, country = 'CO') {
  return (projects || []).flatMap((project) => (project.lines || []).map(({ code, qty }) => {
    const item = catalogByCode?.get?.(code);
    const unitPrice = Number(item?.prices?.[country] || 0);
    return { code, qty, description: item?.raw?.descLarga || item?.ui?.title || 'Producto no encontrado',
      unitPrice, price: unitPrice, prices: item?.prices || { CO: 0, EUC: 0, USD: 0 },
      total: qty * unitPrice, groupId: `XML:${project.id}`, groupName: `PROYECTO: ${project.name}`,
      source: 'XML', sourceProjectId: project.id, category: 'Componentes' };
  }));
}
