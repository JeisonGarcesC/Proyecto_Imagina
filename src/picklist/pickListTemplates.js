const BASE_EXAMPLES = Object.freeze([
  { codigo: 'EJEMPLO001', descripcion: 'Perfil especial de aluminio', cantidad: 2, precio: 125000, tipologia: null },
  { codigo: 'EJEMPLO002', descripcion: 'Herraje especial', cantidad: 1, precio: null, tipologia: null },
  { codigo: 'EJEMPLO003', descripcion: 'Panel adicional', cantidad: 2, precio: 85000, tipologia: null },
]);

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function xmlText(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function generatePickListTemplate(format, projectTypologyKey = null) {
  const EXAMPLES = BASE_EXAMPLES.map((row, index) =>
    index === 2 ? { ...row, tipologia: projectTypologyKey } : row);
  if (format === 'json') return `${JSON.stringify(EXAMPLES, null, 2)}\n`;
  if (format === 'csv') return `codigo,descripcion,cantidad,precio,tipologia\r\n${EXAMPLES.map((row) =>
    [row.codigo, row.descripcion, row.cantidad, row.precio, row.tipologia].map(csvCell).join(',')
  ).join('\r\n')}\r\n`;
  if (format === 'xml') return `<?xml version="1.0" encoding="UTF-8"?>\n<DataRecords>\n${EXAMPLES.map((row) =>
    `  <Record>\n    <CODIGO_PT>${xmlText(row.codigo)}</CODIGO_PT>\n    <DESCRIPCION_LARGA>${xmlText(row.descripcion)}</DESCRIPCION_LARGA>\n    <CANTIDAD>${row.cantidad}</CANTIDAD>\n    <PRECIO>${row.precio ?? ''}</PRECIO>\n    <TIPOLOGIA>${xmlText(row.tipologia)}</TIPOLOGIA>\n  </Record>`
  ).join('\n')}\n</DataRecords>\n`;
  throw new Error('Formato de plantilla no admitido.');
}
