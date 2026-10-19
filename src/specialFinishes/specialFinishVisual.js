import * as THREE from 'three';
import { parseRgbValue } from '../materials/colorUtils.js';
import { getSpecialFinishTextureBlob } from './specialFinishApi.js';

const visuals = new Map();

export function specialFinishVisualKey(finish) {
  const id = String(finish?.id || '');
  const revision = Number(finish?.revision);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || !Number.isInteger(revision) || revision < 1) {
    throw new Error('El acabado no tiene una identidad válida.');
  }
  return `${id}:${revision}`;
}

export async function loadTextureFromBlob(blob, loader = new THREE.TextureLoader()) {
  const url = URL.createObjectURL(blob);
  try {
    const texture = await loader.loadAsync(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function prepareSpecialFinishVisual(finish, { fetchTexture = getSpecialFinishTextureBlob,
  decodeTexture = loadTextureFromBlob } = {}) {
  const key = specialFinishVisualKey(finish);
  if (visuals.has(key)) return visuals.get(key);
  const identity = Object.freeze({ source: 'SPECIAL_FINISH', specialFinishId: finish.id,
    revision: finish.revision, assetId: finish.asset?.id || null, assetVersion: finish.asset?.version || null });
  const promise = (async () => {
    if (finish.type === 'RGB') {
      const rgb = finish.rgb;
      const color = rgb && ['r', 'g', 'b'].every((channel) => Number.isInteger(rgb[channel])
        && rgb[channel] >= 0 && rgb[channel] <= 255)
        ? parseRgbValue(`#${['r', 'g', 'b'].map((channel) =>
          rgb[channel].toString(16).padStart(2, '0')).join('')}`)
        : parseRgbValue(rgb);
      if (!color) throw new Error('El color de este acabado no está disponible.');
      return { identity, definition: { color } };
    }
    if (finish.type === 'TEXTURE' && finish.asset?.id) {
      const blob = await fetchTexture(finish.asset.id);
      const mapTexture = await decodeTexture(blob);
      return { identity, definition: { color: '#ffffff', mapTexture } };
    }
    throw new Error('El recurso de este acabado no está disponible.');
  })();
  visuals.set(key, promise);
  promise.catch(() => { if (visuals.get(key) === promise) visuals.delete(key); });
  return promise;
}
