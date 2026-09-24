import { hydrateLinkGlbParts } from '../renderers/LinkGlbRenderer.js';
import { MathUtils } from 'three';
import { buildLink } from '../builders/LinkBuilder.js';
import { renderLinkProduct } from '../renderers/LinkNativeRenderer.js';
import { resolveLinkBOM } from '../bom/linkBOM.js';
import { LINK_DIMENSIONS } from '../definitions/linkDefaults.js';
import { initializeLinkComponent } from '../integration/linkComponentIdentity.js';

export function createLinkInstance({ config = {}, instanceId = MathUtils.generateUUID(), groupId = instanceId, transform = {}, applyFinishes, loadAsset, onVisualReady, deferHydration = false } = {}) {
  let product;
  try { product = buildLink(config); }
  catch (error) { return { success: false, object: null, reason: error.message }; }
  const object = renderLinkProduct(product), c = product.config, bom = resolveLinkBOM(product);
  object.name = `LINK ${c.type}`;
  object.traverse(node => {
    const shared = { line: 'LINK', groupId, productKey: product.productKey };
    if (node === object) Object.assign(node.userData, shared, { instanceId });
    else {
      delete node.userData.instanceId;
      Object.assign(node.userData, shared, { parentAssemblyId: instanceId });
    }
  });
  Object.assign(object.userData, {
    kind: 'LINK_PRODUCT', type: 'LINK_PRODUCT', family: 'LINK',
    instanceId, groupId, groupName: bom.status === 'PARTIAL' ? 'LINK · BOM parcial (componentes pendientes)' : 'LINK · componentes base',
    config: c, codigoPT: null, code: null, description: `LINK ${c.type}`, isPartRoot: true, hasVisual: true,
    visualSource: 'LINK_ASSEMBLY', bom: bom.rows, bomStatus: bom.status, missingBOM: bom.missing,
    diagnostics: product.diagnostics,
    dim: { widthMm: product.bounds?.widthMm || c.widthMm * c.puestos, thickMm: product.thickMm, depthMm: product.bounds?.depthMm || product.layout.totalDepthMm,
      heightMm: LINK_DIMENSIONS.supportHeightMm + product.thickMm },
  });
  object.children.forEach((component) => initializeLinkComponent(component, object));
  if (Array.isArray(transform.position)) object.position.fromArray(transform.position);
  if (Array.isArray(transform.quaternion)) object.quaternion.fromArray(transform.quaternion);
  else if (Array.isArray(transform.rotation)) object.rotation.fromArray(transform.rotation);
  if (Array.isArray(transform.scale)) object.scale.fromArray(transform.scale);
  applyFinishes?.(object);
  object.updateMatrixWorld(true);
  const visualsReady = deferHydration
    ? Promise.resolve([])
    : hydrateLinkGlbParts(object, product, { loadAsset, onVisualReady: onVisualReady || applyFinishes });
  return { success: true, visualsReady, object, product, config: c, diagnostics: product.diagnostics };
}
