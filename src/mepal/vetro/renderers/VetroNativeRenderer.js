import { buildVetroProductKey } from './vetroAssetResolver.js';
import { createVetroPanelGeometry } from './native/createVetroPanelGeometry.js';
import { createVetroDoorLeafGeometry } from './native/createVetroDoorLeafGeometry.js';
import { createVetroDoorFrameGeometry } from './native/createVetroDoorFrameGeometry.js';
import { createVetroJunctionKitGeometry } from './native/createVetroJunctionKitGeometry.js';
import { createVetroProfileGeometry } from './native/createVetroProfileGeometry.js';
import { createVetroAccessoryGeometry } from './native/createVetroAccessoryGeometry.js';

const BUILDERS = Object.freeze({
  PANEL: createVetroPanelGeometry,
  DOOR_LEAF: createVetroDoorLeafGeometry,
  DOOR_FRAME: createVetroDoorFrameGeometry,
  JUNCTION_KIT: createVetroJunctionKitGeometry,
  PROFILE: createVetroProfileGeometry,
  ACCESSORY: createVetroAccessoryGeometry,
});

export function renderVetroNative({ instanceId, product } = {}) {
  const builder = BUILDERS[product?.productType];
  if (!builder) return null;
  const result = builder(product);
  const productKey = buildVetroProductKey(product);
  result.root.name = `VETRO_NATIVE_${instanceId}`;
  result.root.userData = {
    ...result.root.userData,
    visualSource: 'NATIVE',
    approximationFlags: [...(result.approximationFlags || [])],
    instanceId,
    productKey,
    codigoPT: product?.codeResolution?.code || null,
    shape2D: result.shape2D || null,
  };
  result.root.traverse((node) => {
    node.userData = { ...(node.userData || {}), instanceId, productKey, codigoPT: product?.codeResolution?.code || null };
  });
  return { ...result, productKey };
}
