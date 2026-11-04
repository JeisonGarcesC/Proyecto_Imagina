import { createPickListItem, normalizePickListCode } from './pickList.js';
import { resolvePickListTypology } from './pickListTypologies.js';

function getValue(row, names) {
  const lookup = new Map(Object.entries(row).map(([key, value]) => [key.toLocaleLowerCase('es'), value]));
  for (const name of names) if (lookup.has(name)) return lookup.get(name);
  return undefined;
}

function normalizeRow(row) {
  return {
    codigo: getValue(row, ['codigo', 'código', 'codigo_pt', 'code']),
    descripcion: getValue(row, ['descripcion', 'descripción', 'descripcion_larga', 'description']),
    cantidad: getValue(row, ['cantidad', 'qty', 'quantity']),
    precio: getValue(row, ['precio', 'price', 'unitprice']),
    tipologia: getValue(row, ['tipologia', 'tipología']),
    tipologiaKey: getValue(row, ['tipologiakey', 'tipologia_key']),
  };
}

export function parsePickListJson(text) {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed) ? parsed : parsed?.items || parsed?.lineas;
  if (!Array.isArray(rows)) throw new Error('JSON debe contener una lista de códigos.');
  return rows.map((row) => normalizeRow(row && typeof row === 'object' ? row : {}));
}

export function parsePickListCsv(text) {
  const input = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = input.split(/\r?\n/, 1)[0] || '';
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index += 1; }
      else if (quoted || !field) quoted = !quoted;
      else field += char;
    } else if (char === delimiter && !quoted) {
      record.push(field); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      record.push(field); field = '';
      if (record.some((value) => String(value).trim())) records.push(record);
      record = [];
    } else field += char;
  }
  if (quoted) throw new Error('CSV con comillas sin cerrar.');
  record.push(field);
  if (record.some((value) => String(value).trim())) records.push(record);
  const [header, ...body] = records;
  if (!header) throw new Error('CSV vacío.');
  const columns = header.map((name) => name.trim());
  const normalizedHeader = normalizeRow(Object.fromEntries(columns.map((name) => [name, name])));
  if (!normalizedHeader.codigo || !normalizedHeader.descripcion)
    throw new Error('CSV requiere encabezados codigo y descripcion.');
  return body.map((values, index) => ({
    ...normalizeRow(Object.fromEntries(columns.map((name, column) => [name, values[column] ?? '']))),
    __rowNumber: index + 2,
  }));
}

export function parsePickListXml(text, Parser = globalThis.DOMParser) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('El XML contiene declaraciones no permitidas.');
  if (typeof Parser !== 'function') throw new Error('No hay parser XML disponible.');
  const document = new Parser().parseFromString(text, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('XML mal formado.');
  // Compatible con DataRecords/Record del importador BOM y Articulo de listas comerciales.
  const rows = Array.from(document.querySelectorAll('Record, record, Articulo, articulo, Item, item, Linea, linea'));
  if (!rows.length) throw new Error('XML sin registros Record, Articulo, Item o Linea.');
  return rows.map((node) => normalizeRow(Object.fromEntries(
    Array.from(node.children).map((child) => [child.localName, child.textContent?.trim()])
  )));
}

export function validatePickListImport(rows, existing = [], validTypologies = []) {
  const seen = new Set(existing.map((item) => normalizePickListCode(item.codigo)));
  const accepted = [];
  const rejected = [];
  const warnings = [];
  rows.forEach((row, index) => {
    const rowNumber = row?.__rowNumber ?? index + 1;
    try {
      const requested = String(row?.tipologiaKey ?? row?.tipologia ?? '').trim();
      const tipologiaKey = resolvePickListTypology(requested, validTypologies);
      const item = createPickListItem({ ...row, tipologiaKey, tipologia: null });
      const key = normalizePickListCode(item.codigo);
      if (seen.has(key)) throw new Error(`el código ${item.codigo} ya existe en PickList`);
      seen.add(key);
      accepted.push(item);
      if (requested && !tipologiaKey)
        warnings.push(`Fila ${rowNumber}: tipología "${requested}" no existe. La línea fue agregada a PICKLIST.`);
    } catch (error) {
      rejected.push(`Fila ${rowNumber}: ${error.message}`);
    }
  });
  return { found: rows.length, accepted, rejected, warnings };
}
