// src/mepal/compendio/factories/createCompendioInstance.js
import { MathUtils } from 'three';
import { buildCompendio } from '../builders/CompendioBuilder.js';
import { renderCompendioProduct } from '../renderers/CompendioRenderer.js';
import { isCompendioCurva2, isCompendioCurva60a75 } from '../definitions/compendioDefaults.js';

export function createCompendioInstance({
  config = {},
  instanceId = MathUtils.generateUUID(),
  groupId = instanceId,
  transform = {},
} = {}) {
  let product;
  try {
    product = buildCompendio(config);
  } catch (error) {
    return { success: false, object: null, reason: error.message };
  }

  const object = renderCompendioProduct(product);
  const c = product.config;

  object.name = `COMPENDIO ${c.surfaceType}`;

  object.traverse((node) => {
    const shared = {
      line: 'COMPENDIO',
      groupId,
      productKey: product.productKey,
    };
    if (node === object) {
      Object.assign(node.userData, shared, { instanceId });
    } else {
      delete node.userData.instanceId;
      Object.assign(node.userData, shared, {
        parentAssemblyId: instanceId,
        instanceId: `${instanceId}:component:${node.userData.componentKey || node.name}`,
      });
    }
  });

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
      code: `COMP_SUP_${typeCode}${(isCurva60a75 || isCurva2) && c.inverted ? '_INV' : ''}_${c.widthMm}_${product.bounds.depthMm}`,
      quantity: 1,
      description: desc,
    },
  ];

  Object.assign(object.userData, {
    kind: 'COMPENDIO_PRODUCT',
    type: 'COMPENDIO_PRODUCT',
    family: 'COMPENDIO',
    instanceId,
    groupId,
    groupName: `Compendio · ${c.surfaceType}`,
    config: c,
    codigoPT: null,
    code: bom[0].code,
    description: bom[0].description,
    isPartRoot: true,
    hasVisual: true,
    visualSource: 'COMPENDIO_ASSEMBLY',
    bom,
    dim: {
      widthMm: product.bounds.widthMm,
      thickMm: product.thickMm,
      depthMm: product.bounds.depthMm,
      heightMm: product.bounds.heightMm,
    },
  });

  if (Array.isArray(transform.position)) object.position.fromArray(transform.position);
  if (Array.isArray(transform.quaternion)) object.quaternion.fromArray(transform.quaternion);
  else if (Array.isArray(transform.rotation)) object.rotation.fromArray(transform.rotation);
  if (Array.isArray(transform.scale)) object.scale.fromArray(transform.scale);

  object.updateMatrixWorld(true);

  return { success: true, object, product, config: c };
}
