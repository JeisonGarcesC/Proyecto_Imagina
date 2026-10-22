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
  let box = new Box3().setFromObject(model), size = box.getSize(new Vector3());
  if (size.toArray().some(value => !Number.isFinite(value) || value <= 0)) {
    model.traverse(node => { if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); } });
    throw new Error('LINK_CABLE_MODEL_EMPTY');
  }

  // Normalizar orientación de los costados: si el GLB viene con el eje mayor en Z (como ELSO060000 y ELSO070000),
  // se orienta a X local para que la rotación paramétrica estándar de Three.js lo alinee con la profundidad Z.
  const isSpecial120Support = part.logicalCode === 'LKSO110000' || part.logicalCode === 'ELSO740000' ||
    Boolean(part.model?.src?.includes('C360G')) || Boolean(part.model?.src?.includes('C120G'));
  if (part.role === 'SUPPORT' && size.z > size.x && !isSpecial120Support) {
    model.rotation.y = -Math.PI / 2;
    box = new Box3().setFromObject(model);
    size = box.getSize(new Vector3());
  }

  // Normalizar orientación del pedestal: el GLB de Zen Almacenamiento se orienta para que el frente (gavetas)
  // mire hacia el frente (-Z) hacia fuera del puesto y no hacia el grommet (+Z), con su ancho (400 mm) en X y profundidad (500 mm) en Z.
  if (part.role === 'PEDESTAL') {
    model.rotation.y = -Math.PI / 2;
    box = new Box3().setFromObject(model);
    size = box.getSize(new Vector3());
  }

  // Normalizar orientación de los ductos bajantes a piso y techo de Link:
  // Deben ser 100% VERTICALES (como un poste/palo mirando hacia arriba, con la altura en Y).
  if ((part.role === 'FLOOR_DUCT' || part.role === 'CEILING_DUCT') && part.model?.src?.includes('/Link/Ductos/')) {
    // Si el largo (tubo) viene acostado en X: rotar 90° en Z para que quede vertical en Y
    if (size.x > size.y && size.x > size.z) {
      model.traverse(node => {
        if (node.isMesh && node.geometry) {
          node.geometry.rotateZ(Math.PI / 2);
        }
      });
    } else if (size.z > size.y && size.z > size.x) {
      // Si el largo (tubo) viene acostado en Z: rotar 90° en X para que quede vertical en Y
      model.traverse(node => {
        if (node.isMesh && node.geometry) {
          node.geometry.rotateX(-Math.PI / 2);
        }
      });
    }
  }

  const partDimensions = getLinkPartDimensions(part);
  const dimensions = part.role === 'GROMMET'
    ? [partDimensions[0] + 2, 33.542, 115.5] // flange extends beyond the cutout
    : partDimensions;
  const center = box.getCenter(new Vector3());
  model.position.sub(center);

  // Manejo de la tapa del ducto en los costados terminales de Link (ELSO060000 y ELSO090000)
  if (part.role === 'SUPPORT') {
    const isDobleTerminal = Boolean(part.model?.src?.includes('ELSO060000'));
    const isSingleTerminal = Boolean(part.model?.src?.includes('ELSO090000'));
    const tapaNodeNames = isDobleTerminal
      ? ['0_20', '0_11', '0_21']
      : isSingleTerminal
        ? ['0_27', '0_1', '0_23']
        : [];
    const hasTapa = part.componentConfig?.hasTapa !== false && part.hasTapa !== false;
    tapaNodeNames.forEach(name => {
      const n = model.getObjectByName(name);
      if (n) {
        n.visible = hasTapa;
        n.traverse(child => {
          if (child.isMesh) {
            child.userData.isCostadoTapa = true;
            child.userData.supportKey = part.key;
          }
        });
      }
    });

    // Ubicar la tapa del costado terminal individual (ELSO090000_60) en la esquina del ducto cableado
    if (isSingleTerminal) {
      const rotY = Number(part.rotation?.y ?? part.rotationY ?? 0);
      const depthMm = part.dimMm?.depthMm || 600;
      // 0.195 m cubre todo el cuadrado del ducto cableado sin quedar metido en el poste del costado
      const shiftDist = 0.195 * (depthMm / 600);
      const shiftY = rotY < 0 ? -shiftDist : shiftDist;
      ['0_27', '0_1', '0_23'].forEach(name => {
        const n = model.getObjectByName(name);
        if (n) n.position.y += shiftY;
      });
    }
  }

  if (part.model?.exactSize) {
    // Determine uniform scale factor (assuming model might be in mm or m).
    // If size.y is ~710, it's in mm, so scale is 1/1000. If ~0.71, scale is 1.
    const scale = size.y > 10 ? 1 / 1000 : 1;
    // Eje largo del GLB del costado = X local (la rotación Y de la pieza lo lleva a la profundidad).
    // Escala por eje del GLB local (X, Y, Z), opcional: p. ej. el conector de cableado de la credenza del líder.
    const [axisX = 1, axisY = 1, axisZ = 1] = part.model.axisScale || [];
    visual.scale.set(scale * (part.model.lengthScale || 1) * axisX, scale * axisY, scale * axisZ);
  } else {
    visual.scale.set(...dimensions.map((value, index) => value / 1000 / size.getComponent(index)));
  }
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
        const isChrome = product.config.supportFinish === 'CROMADO' || part.componentConfig?.supportFinish === 'CROMADO';
        const color = part.materialRole === 'surface'
          ? product.config.surfaceColor
          : part.materialRole === 'pedestal'
            ? product.config.pedestalColor
            : (isChrome ? '#c9ced4' : product.config.structureColor);
        material = new MeshStandardMaterial({
          color,
          roughness: isChrome ? 0.15 : 0.55,
          metalness: isChrome ? 0.9 : 0.3
        });
      }
      const visual = createVisual(source, part, material);
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
