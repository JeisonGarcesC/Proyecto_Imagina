import { parseDxfText } from '../parsers/dxfPlanParser.js';
import { normalizeDxf } from '../parsers/normalizeDxf.js';

export const MAX_DXF_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  '',
  'application/dxf',
  'application/x-dxf',
  'drawing/x-dxf',
  'image/vnd.dxf',
  'text/plain',
  'application/octet-stream',
]);

export function canLoadDxfPlan(fileOrBlob) {
  if (!(fileOrBlob instanceof Blob)) return false;
  const fileName = String(fileOrBlob.name || '').toLowerCase();
  const hasDxfExtension = !fileName || fileName.endsWith('.dxf');
  return hasDxfExtension && ACCEPTED_MIME_TYPES.has(String(fileOrBlob.type || '').toLowerCase());
}

export async function loadDxfPlan(fileOrBlob, options = {}) {
  validateDxfBlob(fileOrBlob, options);
  const text = await fileOrBlob.text();
  validateDxfText(text);
  const parsed = parseDxfText(text);
  return normalizeDxf(parsed, options);
}

function validateDxfBlob(fileOrBlob, options) {
  if (!(fileOrBlob instanceof Blob)) throw new TypeError('Se esperaba un archivo o Blob DXF.');
  const fileName = String(fileOrBlob.name || '');
  if (fileName && !fileName.toLowerCase().endsWith('.dxf')) {
    throw new Error('El archivo debe tener extensión .dxf.');
  }
  const mimeType = String(fileOrBlob.type || '').toLowerCase();
  if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
    throw new Error(`MIME DXF no compatible: ${mimeType || '(vacío)'}.`);
  }
  const maxFileSize = Number(options.maxFileSize) || MAX_DXF_FILE_SIZE;
  if (fileOrBlob.size > maxFileSize) {
    throw new Error(`El DXF supera el tamaño máximo de ${maxFileSize} bytes.`);
  }
}

function validateDxfText(text) {
  const source = String(text || '');
  if (source.startsWith('AutoCAD Binary DXF')) {
    throw new Error('El archivo utiliza DXF binario, todavía no soportado.');
  }
  if (!/(?:^|\r?\n)\s*SECTION\s*(?:\r?\n|$)/i.test(source)) {
    throw new Error('El archivo DXF no contiene SECTION.');
  }
  if (!/(?:^|\r?\n)\s*ENTITIES\s*(?:\r?\n|$)/i.test(source)) {
    throw new Error('El archivo DXF no contiene la sección ENTITIES.');
  }
  if (!/(?:^|\r?\n)\s*EOF\s*$/i.test(source)) {
    throw new Error('El archivo DXF no contiene EOF.');
  }
}
