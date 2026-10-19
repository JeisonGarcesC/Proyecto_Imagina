import { authFetch } from '../auth/authApi.js';

export const SPECIAL_FINISH_BASE = '/api/special-finishes';
export const MAX_TEXTURE_BYTES = 5 * 1024 * 1024;

export function specialFinishError(error) {
  if (!error?.status) return 'No se pudo conectar con el servidor. Intenta de nuevo.';
  const messages = {
    401: 'Tu sesión terminó. Inicia sesión de nuevo.',
    403: 'No tienes permiso para realizar esta acción.',
    404: 'El acabado o la imagen ya no está disponible.',
    409: 'El acabado cambió mientras trabajabas. Actualiza el catálogo.',
    413: 'La imagen supera el tamaño máximo de 5 MiB.',
    415: 'La imagen debe ser JPG, JPEG o PNG.',
    422: 'Revisa el nombre, el color o la imagen seleccionada.',
    500: 'El servidor no pudo completar la operación. Intenta de nuevo.',
  };
  return messages[error.status] || 'No se pudo completar la operación. Intenta de nuevo.';
}

async function request(path, options = {}, responseType = 'json') {
  const response = await authFetch(`${SPECIAL_FINISH_BASE}${path}`, options);
  if (!response.ok) {
    const error = new Error('Special finish request failed');
    error.status = response.status;
    throw error;
  }
  return responseType === 'blob' ? response.blob() : response.json();
}

export function listSpecialFinishes({ page = 1, pageSize = 12, search = '', signal } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set('search', search.trim());
  return request(`?${params}`, { signal });
}

export function createSpecialFinish(payload) {
  return request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

export function uploadSpecialFinishTexture(file) {
  return request('/textures', { method: 'POST', headers: {
    'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name),
  }, body: file });
}

export function getSpecialFinishTextureBlob(assetId, signal) {
  return request(`/textures/${encodeURIComponent(assetId)}`, { signal }, 'blob');
}
