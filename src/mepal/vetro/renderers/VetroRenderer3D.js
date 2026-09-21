import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { renderVetroNative } from './VetroNativeRenderer.js';

function applyAssetTransform(object, transform = {}) {
  object.position.fromArray(transform.position || [0, 0, 0]);
  object.rotation.fromArray(transform.rotation || [0, 0, 0]);
  object.scale.fromArray(transform.scale || [1, 1, 1]);
  object.updateMatrixWorld(true);
}

function prepareVisual(root, asset, product) {
  root.traverse((node) => {
    node.userData = {
      ...(node.userData || {}),
      vetroAssetId: asset.id,
      vetroProductKey: asset.productKey,
      vetroProductCode: product?.codeResolution?.code || null,
    };
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

export async function renderVetroProduct({ instanceId, product, asset, loadAsset } = {}) {
  const root = new THREE.Group();
  root.name = `VETRO_PRODUCT_${instanceId}`;

  if (!asset?.available) {
    const native = renderVetroNative({ instanceId, product });
    if (!native?.root) {
      return { root, renderStatus: 'ASSET_NOT_AVAILABLE', hasVisual: false, visualSource: null, assetMetadata: null, diagnostics: [], approximationFlags: [], shape2D: null };
    }
    root.add(native.root);
    return {
      root, renderStatus: 'NATIVE_AVAILABLE', hasVisual: true, visualSource: 'NATIVE',
      assetMetadata: null, diagnostics: native.diagnostics || [],
      approximationFlags: native.approximationFlags || [], shape2D: native.shape2D || null,
      productKey: native.productKey,
    };
  }

  const loader = loadAsset || (async (src) => {
    const gltf = await new GLTFLoader().loadAsync(src);
    return gltf?.scene || null;
  });

  try {
    const visual = await loader(asset.src, asset);
    if (!visual?.isObject3D) throw new Error('VETRO_ASSET_INVALID_SCENE');
    visual.name = `VETRO_VISUAL_${asset.id}`;
    applyAssetTransform(visual, asset.transform);
    prepareVisual(visual, asset, product);
    root.add(visual);
    root.userData.vetroAsset = {
      id: asset.id, src: asset.src, productKey: asset.productKey,
      origin: asset.origin, units: asset.units, transform: asset.transform, metadata: asset.metadata,
    };
    return {
      root, renderStatus: 'ASSET_AVAILABLE', hasVisual: true, visualSource: 'GLB',
      diagnostics: [], approximationFlags: [], shape2D: null,
      productKey: asset.productKey, assetMetadata: root.userData.vetroAsset,
    };
  } catch (error) {
    root.userData.assetError = String(error?.message || error);
    return {
      root, renderStatus: 'ASSET_LOAD_FAILED', hasVisual: false, visualSource: null,
      diagnostics: [], approximationFlags: [], shape2D: null, assetMetadata: null, error,
    };
  }
}

export function disposeVetroProduct(root) {
  root?.traverse?.((node) => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material) => material.dispose?.());
  });
  root?.clear?.();
}
