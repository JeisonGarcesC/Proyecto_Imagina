import * as THREE from 'three';
export async function renderVetroProduct({ instanceId, product, asset } = {}) {
  const root = new THREE.Group();
  root.name = `VETRO_PRODUCT_${instanceId}`;
  if (!asset?.available) return { root, renderStatus: 'ASSET_NOT_AVAILABLE', hasVisual: false };
  throw new Error(`VETRO_ASSET_RENDERER_NOT_IMPLEMENTED:${product?.codeResolution?.code || 'UNKNOWN'}`);
}
export function disposeVetroProduct(root) {
  root?.traverse?.((node) => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material) => material.dispose?.());
  });
  root?.clear?.();
}
