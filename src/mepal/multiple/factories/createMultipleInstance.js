import { MathUtils } from 'three';
import { buildMultiple } from '../builders/MultipleBuilder.js';
import { renderMultipleProduct } from '../renderers/MultipleNativeRenderer.js';
import { applyMultipleTransformOverride, initializeMultipleComponent } from '../integration/multipleComponentIdentity.js';
import { resolveMultipleBOM } from '../bom/multipleBOM.js';
import { getMultipleProductConnectionPoints } from '../connections/multipleConnectionPoints.js';
export function createMultipleInstance({ config = {}, instanceId = MathUtils.generateUUID(), groupId = instanceId, transform = {} } = {}) {
  let product; try { product = buildMultiple(config); } catch (error) { return { success: false, reason: error.message, diagnostics: [] }; }
  const object = renderMultipleProduct(product);
  const bom = resolveMultipleBOM(product);
  Object.assign(object.userData, { kind: 'MULTIPLE_PRODUCT', type: 'MULTIPLE_PRODUCT', family: 'MULTIPLE', line: 'MULTIPLE', instanceId, groupId,
    groupName: 'Multiple', description: 'Sistema modular Multiple', isPartRoot: true, hasVisual: true, config: product.config,
    composition: product.composition, diagnostics: product.diagnostics, bom: bom.rows, bomStatus: bom.status, missingBOM: bom.missing,
    dim: { widthMm: product.dimensions.widthCm * 10, heightMm: product.dimensions.heightCm * 10, depthMm: product.dimensions.thicknessCm * 10 } });
  object.userData.connectionPoints = getMultipleProductConnectionPoints(object);
  object.userData.spatialConnections = [];
  object.children.forEach((component) => { initializeMultipleComponent(component, object); applyMultipleTransformOverride(component, product.config.components?.[component.userData.componentKey]?.transformOverride); });
  if (Array.isArray(transform.position)) object.position.fromArray(transform.position); if (Array.isArray(transform.quaternion)) object.quaternion.fromArray(transform.quaternion);
  if (Array.isArray(transform.scale)) object.scale.fromArray(transform.scale); object.updateMatrixWorld(true);
  return { success: true, object, product, config: product.config, diagnostics: product.diagnostics };
}
