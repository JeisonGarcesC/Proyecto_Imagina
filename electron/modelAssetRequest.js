import { isModelAssetRef } from './modelAssetStore.js';

export function parseModelAssetRequestUrl(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'imagina-asset:' || url.hostname !== 'model' || url.port || url.username
    || url.password || url.search || url.hash) return null;
  const legacy = /^\/([0-9a-f-]{36})\.glb$/.exec(url.pathname);
  const prepared = /^\/([0-9a-f-]{36})\/(model\.gltf|buffer-[0-9]{3}\.bin)$/.exec(url.pathname);
  const assetRef = legacy?.[1] || prepared?.[1];
  if (!isModelAssetRef(assetRef)) return null;
  return { assetRef, fileName: prepared?.[2] || null, prepared: Boolean(prepared) };
}
