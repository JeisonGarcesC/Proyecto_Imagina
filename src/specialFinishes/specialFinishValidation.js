import { MAX_TEXTURE_BYTES } from './specialFinishApi.js';

export function parseRgbChannels(channels) {
  const values = ['r', 'g', 'b'].map((key) => String(channels?.[key] ?? '').trim());
  if (values.some((value) => !/^(0|[1-9]\d{0,2})$/.test(value))) return null;
  const numbers = values.map(Number);
  if (numbers.some((value) => value > 255)) return null;
  return { r: numbers[0], g: numbers[1], b: numbers[2] };
}

export function validateTextureFile(file) {
  if (!file) return 'Selecciona una imagen JPG, JPEG o PNG.';
  if (!/\.(jpe?g|png)$/i.test(file.name || '')) return 'La imagen debe ser JPG, JPEG o PNG.';
  const expectedMime = /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg';
  if (file.type !== expectedMime) return 'El formato de la imagen no coincide con el archivo.';
  if (!file.size || file.size > MAX_TEXTURE_BYTES) return 'La imagen debe pesar entre 1 byte y 5 MiB.';
  return null;
}
