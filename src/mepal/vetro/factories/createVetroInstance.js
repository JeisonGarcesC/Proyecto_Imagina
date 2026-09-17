import { normalizeVetroConfig, resolveVetroProduct } from '../resolvers/vetroProductResolver.js';
import { createVetroProductDefinition } from '../definitions/vetroProductDefinition.js';
import { createVetroInstanceDefinition, createVetroInstanceId } from '../definitions/vetroInstanceDefinition.js';
import { resolveVetroAsset } from '../renderers/vetroAssetResolver.js';
import { renderVetroProduct } from '../renderers/VetroRenderer3D.js';
import { applyVetroTransform } from '../layout/vetroLayout.js';

function dimensionsMm(product) {
  const d = product?.dimensions || {};
  const documented = d.documented || {};
  const widthCm = d.realWidthCm ?? d.nominalWidthCm ?? documented.width ?? null;
  const heightCm = d.nominalHeightCm ?? documented.height ?? d.nominalLengthCm ?? null;
  const depthCm = documented.depth ?? null;
  return {
    widthMm: widthCm == null ? null : widthCm * 10,
    heightMm: heightCm == null ? null : heightCm * 10,
    depthMm: depthCm == null ? null : depthCm * 10,
  };
}

export async function createVetroInstance(options = {}) {
  const config = normalizeVetroConfig(options.config || options);
  const resolved = resolveVetroProduct(config);
  if (!resolved.codeResolution.supported || !resolved.codeResolution.code) {
    return { success: false, object: null, config, product: resolved, diagnostics: resolved.diagnostics };
  }
  const product = createVetroProductDefinition(resolved);
  const instanceId = String(options.instanceId || createVetroInstanceId());
  const definition = createVetroInstanceDefinition({ instanceId, config, product, transform: options.transform });
  const asset = resolveVetroAsset(product);
  const rendered = await renderVetroProduct({ instanceId, product, asset });
  const object = applyVetroTransform(rendered.root, options.transform || {});
  const code = product.codeResolution.code;
  object.userData = {
    ...object.userData,
    kind: 'VETRO_PRODUCT', family: 'VETRO', type: 'vetro-product', line: 'VETRO',
    code, codigoPT: code, instanceId, groupId: instanceId, groupName: 'Vetro',
    description: product.commercial?.displayName || 'Producto Vetro',
    config: definition.config, product, definition,
    diagnostics: product.diagnostics, renderStatus: rendered.renderStatus,
    hasVisual: rendered.hasVisual, isPartRoot: true, excludeFromBOM: false,
    dim: dimensionsMm(product),
  };
  return { success: true, object, config, product, definition, asset, diagnostics: product.diagnostics };
}
