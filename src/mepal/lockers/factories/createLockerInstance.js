import { MathUtils } from 'three';
import { resolveLockerProduct } from '../resolvers/lockersProductResolver.js';
import { renderLockerProduct } from '../renderers/LockerNativeRenderer.js';
import { LOCKER_APPROXIMATION_FLAG } from '../renderers/native/lockerNativeConstants.js';

export function createLockerInstance({ config = {}, instanceId = MathUtils.generateUUID(), transform = {} } = {}) {
  const product = resolveLockerProduct(config);
  if (!product.supported) return { success: false, object: null, ...product };
  const object = renderLockerProduct(product), c = product.config;
  const codigoPT = product.codeResolution.code;
  object.traverse(node => {
    Object.assign(node.userData, { instanceId, groupId: instanceId, productKey: product.productKey });
    if (node !== object) node.userData.parentAssemblyId = instanceId;
  });
  object.userData = { ...object.userData, kind: 'LOCKER_PRODUCT', type: 'LOCKER_PRODUCT', family: 'LOCKERS', line: 'LOCKERS',
    groupName: 'Lockers', code: codigoPT, codigoPT, instanceId, groupId: instanceId, config: c,
    calibre: c.calibre, lockerType: c.lockerType, widthMm: c.widthMm, heightMm: c.heightMm, depthMm: c.depthMm,
    bayCount: c.bayCount, columnCount: product.columns, productKey: product.productKey,
    description: product.codeResolution.body.description, bom: product.bom, visualSource: 'NATIVE', renderStatus: 'READY',
    hasVisual: true, isPartRoot: true, excludeFromBOM: false,
    dim: { widthMm: c.widthMm, heightMm: c.heightMm, depthMm: c.depthMm },
    shape2D: { semanticType: 'LOCKER_PRODUCT', geometry: { type: 'RECTANGLE', widthMm: c.widthMm, depthMm: c.depthMm,
      orientation: 'X_Z', bayCount: c.bayCount, columnCount: product.columns }, style: { source: 'LOCKER_NATIVE' } },
    bays: object.children.filter(n => n.userData.componentRole === 'LOCKER_BAY').map(n => ({ ...n.userData, finish: c.bayFinishes[n.userData.bayIndex] || null })),
    diagnostics: [{ code: LOCKER_APPROXIMATION_FLAG, severity: 'WARNING', message: 'Herrajes, holguras y espesores de chapa son aproximaciones visuales; no son cotas de fabricación.' }],
  };
  if (Array.isArray(transform.position)) object.position.fromArray(transform.position);
  if (Array.isArray(transform.quaternion)) object.quaternion.fromArray(transform.quaternion);
  else if (Array.isArray(transform.rotation)) object.rotation.fromArray(transform.rotation);
  if (Array.isArray(transform.scale)) object.scale.fromArray(transform.scale);
  object.updateMatrixWorld(true);
  return { success: true, object, config: c, product, diagnostics: object.userData.diagnostics };
}
