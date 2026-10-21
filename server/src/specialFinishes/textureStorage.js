import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

export const MAX_TEXTURE_BYTES = 5 * 1024 * 1024;
export const MAX_TEXTURE_PIXELS = 40_000_000;
function storageDir() {
  return path.resolve(process.env.SPECIAL_FINISH_STORAGE_DIR || 'server/storage/special-finishes');
}

function fail(status, code, message) {
  throw Object.assign(new Error(message), { status, code });
}

function dimensions(bytes, mimeType) {
  if (mimeType === 'image/png') {
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      || bytes.toString('ascii', 12, 16) !== 'IHDR'
      || !bytes.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'))) return null;
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8
    || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    let marker = bytes[++offset];
    while (marker === 0xff && offset + 1 < bytes.length) marker = bytes[++offset];
    offset++;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > bytes.length) return null;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 7) return null;
      return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
    }
    offset += length;
  }
  return null;
}

export function validateTexture(bytes, mimeType, filename) {
  const name = String(filename || '');
  if (name.length > 200 || !/^[^/\\]+\.(png|jpe?g)$/i.test(name)
    || [...name].some((character) => character.charCodeAt(0) < 32)) {
    fail(422, 'TEXTURE_EXTENSION_INVALID', 'Se requiere un nombre JPG, JPEG o PNG válido.');
  }
  const mime = String(mimeType || '').toLowerCase();
  const extension = name.split('.').pop().toLowerCase();
  if (!['image/jpeg', 'image/png'].includes(mime)
    || (mime === 'image/png' ? extension !== 'png' : !['jpg', 'jpeg'].includes(extension))) {
    fail(415, 'TEXTURE_MIME_INVALID', 'El MIME no coincide con la extensión.');
  }
  if (!Buffer.isBuffer(bytes) || !bytes.length) fail(422, 'TEXTURE_EMPTY', 'La imagen está vacía.');
  if (bytes.length > MAX_TEXTURE_BYTES) fail(413, 'TEXTURE_TOO_LARGE', 'La imagen supera 5 MiB.');
  const size = dimensions(bytes, mime);
  if (!size || !size[0] || !size[1] || size[0] * size[1] > MAX_TEXTURE_PIXELS) {
    fail(422, 'TEXTURE_INVALID', 'Imagen inválida o dimensiones no permitidas.');
  }
  return { mimeType: mime, byteSize: bytes.length, width: size[0], height: size[1],
    sha256: createHash('sha256').update(bytes).digest('hex') };
}

export function texturePath(storageKey) {
  if (!/^[0-9a-f-]{36}\.(png|jpg)$/.test(String(storageKey || ''))) fail(500, 'INVALID_STORAGE_KEY', 'Clave de almacenamiento inválida.');
  return path.join(storageDir(), storageKey);
}

export async function storeTexture(bytes, mimeType, filename) {
  const metadata = validateTexture(bytes, mimeType, filename);
  const storageKey = `${randomUUID()}.${metadata.mimeType === 'image/png' ? 'png' : 'jpg'}`;
  try {
    await mkdir(storageDir(), { recursive: true });
    await writeFile(texturePath(storageKey), bytes, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    throw Object.assign(new Error('No se pudo guardar la textura.', { cause: error }),
      { status: 500, code: 'TEXTURE_STORAGE_FAILED' });
  }
  return { ...metadata, storageKey };
}

export async function removeFailedUpload(storageKey) {
  await unlink(texturePath(storageKey));
}

export async function readTexture(storageKey) {
  return readFile(texturePath(storageKey));
}
