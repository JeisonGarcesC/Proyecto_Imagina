import { Box3, Group, MeshStandardMaterial, Vector3 } from 'three';
import { getLinkPartDimensions } from '../parts/linkParts.js';

// Geometry-only adaptation: the component keeps all LINK identifiers and BOM metadata.
// The caller supplies the existing application's GLB loader/cache.
function createVisual(source, part, material) {
  const visual = new Group(), model = source.clone(true);
  visual.add(model);
  model.traverse(node => {
    node.userData = {};
    if (node.isMesh) {
      node.geometry = node.geometry.clone();
      node.material = material.clone();
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  const box = new Box3().setFromObject(model), size = box.getSize(new Vector3());
  if (size.toArray().some(value => !Number.isFinite(value) || value <= 0)) {
    model.traverse(node => { if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); } });
    throw new Error('LINK_CABLE_MODEL_EMPTY');
  }
  const partDimensions = getLinkPartDimensions(part);
  const dimensions = part.role === 'GROMMET'
    ? [partDimensions[0] + 2, 33.542, 115.5] // flange extends beyond the cutout
    : partDimensions;
  const center = box.getCenter(new Vector3());
  model.position.sub(center);
  visual.scale.set(...dimensions.map((value, index) => value / 1000 / size.getComponent(index)));
  return visual;
}

export async function hydrateLinkGlbParts(object, product, { loadAsset, onVisualReady } = {}) {
  if (!loadAsset) return [];
  const targets = product.parts.filter(part => part.model?.kind === 'glb' && part.model?.src).map(part => ({
    part, component: object.children.find(child => child.userData.componentKey === part.key),
  }));
  const updatedRoots = new Set();
  const results = await Promise.all(targets.map(async ({ part, component }) => {
    if (!component) return { key: part.key, status: 'MISSING' };
    const expectedGeneration = component.userData.linkGeneration;
    component.userData.visualSource = 'GLB_LOADING';
    component.userData.visualModelSrc = part.model.src;
    try {
      const source = await loadAsset(part.model.src);
      // A rebuild disposes the old components while the asset may still be loading.
      if (component.userData.linkDisposed || !component.parent || component.userData.linkGeneration !== expectedGeneration) return { key: part.key, status: 'CANCELLED' };
      if (!source?.isObject3D) throw new Error('LINK_CABLE_MODEL_INVALID');
      let material;
      component.traverse(node => { if (!material && node.isMesh) material = Array.isArray(node.material) ? node.material[0] : node.material; });
      const ownsMaterial = !material;
      if (!material) {
        const color = part.materialRole === 'surface'
          ? product.config.surfaceColor
          : part.materialRole === 'pedestal'
            ? product.config.pedestalColor
            : product.config.structureColor;
        material = new MeshStandardMaterial({ color, roughness: 0.55 });
      }
      const visual = createVisual(source, part, material);
      if (ownsMaterial) material.dispose();
      const fallbackGeometries = new Set(), fallbackMaterials = new Set();
      component.traverse(node => {
        if (node.geometry) fallbackGeometries.add(node.geometry);
        for (const item of [].concat(node.material || [], node.userData.__origMaterial || [])) fallbackMaterials.add(item);
      });
      fallbackGeometries.forEach(geometry => geometry.dispose());
      component.clear();
      component.userData.__origMaterial = [...fallbackMaterials];
      component.userData.visualSource = 'GLB';
      visual.traverse(node => {
        node.userData = { ...component.userData };
        delete node.userData.isPartRoot;
        if (node.isMesh) node.name = part.description;
      });
      component.add(visual);
      component.updateMatrixWorld(true);
      updatedRoots.add(component.parent);
      return { key: part.key, status: 'READY' };
    } catch (error) {
      if (!component.userData.linkDisposed && component.userData.linkGeneration === expectedGeneration) component.userData.visualError = String(error?.message || error);
      return { key: part.key, status: 'FALLBACK', error: String(error?.message || error) };
    }
  }));
  for (const root of updatedRoots) onVisualReady?.(root);
  return results;
}
