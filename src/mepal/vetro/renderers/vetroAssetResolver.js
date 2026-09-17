const VETRO_ASSETS = Object.freeze({});
export function resolveVetroAsset(product = {}) {
  const code = String(product?.codeResolution?.code || '');
  const asset = VETRO_ASSETS[code] || null;
  if (!asset) return { available: false, kind: null, src: null, diagnostic: 'VETRO_ASSET_NOT_AVAILABLE' };
  return { available: true, ...asset };
}
export function getVetroAssetRegistry() { return VETRO_ASSETS; }
