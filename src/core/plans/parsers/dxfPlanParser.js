import DxfParser from 'dxf-parser';

export function parseDxfText(text) {
  if (typeof text !== 'string') throw new TypeError('El contenido DXF debe ser texto.');
  try {
    const parsed = new DxfParser().parseSync(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('El parser no devolvió un documento.');
    return parsed;
  } catch (error) {
    throw new Error(`No se pudo interpretar el DXF: ${error?.message || error}`, { cause: error });
  }
}
