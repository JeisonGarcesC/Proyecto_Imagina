// src/mepal/compendio/integration/rebuildCompendioInstance.js
import { buildCompendio } from '../builders/CompendioBuilder.js';
import { renderCompendioProduct, disposeCompendioGeometry } from '../renderers/CompendioRenderer.js';
import { isCompendioCurva2, isCompendioCurva60a75 } from '../definitions/compendioDefaults.js';

export function rebuildCompendioInstance({ object, patch = {}, partsRegistry = [] }) {
  if (object?.userData?.kind !== 'COMPENDIO_PRODUCT') {
    return { success: false, reason: 'COMPENDIO_PRODUCT_REQUIRED' };
  }

  const currentConfig = object.userData.config || {};
  const nextConfig = { ...currentConfig, ...patch };

  let nextProduct;
  try {
    nextProduct = buildCompendio(nextConfig);
  } catch (error) {
    return { success: false, reason: error.message };
  }

  const descendants = new Set();
  object.traverse((node) => {
    if (node !== object) descendants.add(node);
  });

  // Limpiar del registry
  for (let i = partsRegistry.length - 1; i >= 0; i--) {
    if (descendants.has(partsRegistry[i]?.obj)) {
      partsRegistry.splice(i, 1);
    }
  }

  // Dispose geometrías y materiales
  disposeCompendioGeometry(object);
  delete object.userData.bounds2d;
  delete object.userData.footprint2D;
  delete object.userData.detailedFootprint2D;

  // Limpiar hijos
  while (object.children.length > 0) {
    object.remove(object.children[0]);
  }

  // Renderizar nuevo contenido
  const newVisual = renderCompendioProduct(nextProduct);
  const instanceId = object.userData.instanceId;
  const groupId = object.userData.groupId || instanceId;

  while (newVisual.children.length > 0) {
    const child = newVisual.children[0];
    newVisual.remove(child);

    child.traverse((node) => {
      const shared = {
        line: 'COMPENDIO',
        groupId,
        productKey: nextProduct.productKey,
      };
      if (node === child) {
        Object.assign(node.userData, shared, {
          parentAssemblyId: instanceId,
          instanceId: `${instanceId}:component:${node.userData.componentKey || node.name}`,
        });
      }
    });

    object.add(child);
    if (!partsRegistry.some((p) => p.obj === child)) {
      partsRegistry.push({ code: child.userData.code, obj: child });
    }
  }

  const c = nextProduct.config;
  const typeCode = c.surfaceType.toUpperCase().replace(/\s+/g, '_');
  const isCurva60a75 = isCompendioCurva60a75(c.surfaceType);
  const isCurva2 = isCompendioCurva2(c.surfaceType);
  const desc = isCurva2
    ? `Superficie orgánica curva 2 ${c.inverted ? '75 a ' + (c.depthMm / 10) : (c.depthMm / 10) + ' a 75'} Compendio ${c.widthMm} mm`
    : isCurva60a75
      ? `Superficie orgánica curva ${c.inverted ? '60 a 75 (inv.)' : '75 a 60'} Compendio ${c.widthMm} mm`
      : `${c.modoEspecial ? 'ESPECIAL · ' : ''}Superficie ${c.surfaceType} Compendio ${c.widthMm}x${c.depthMm} mm`;

  const bom = [
    {
      code: `COMP_SUP_${typeCode}${(isCurva60a75 || isCurva2) && c.inverted ? '_INV' : ''}_${c.widthMm}_${nextProduct.bounds.depthMm}`,
      quantity: 1,
      description: desc,
    },
  ];

  Object.assign(object.userData, {
    config: c,
    code: bom[0].code,
    description: bom[0].description,
    groupName: `Compendio · ${c.surfaceType}`,
    bom,
    dim: {
      widthMm: nextProduct.bounds.widthMm,
      thickMm: nextProduct.thickMm,
      depthMm: nextProduct.bounds.depthMm,
      heightMm: nextProduct.bounds.heightMm,
    },
  });

  object.updateMatrixWorld(true);

  return { success: true, object, product: nextProduct, config: c };
}
