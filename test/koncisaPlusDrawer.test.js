import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createKoncisaPlusDrawerPart,
  KONCISA_PLUS_DRAWER,
} from '../src/mepal/koncisaPlus/parts/koncisaPlusDrawer.js';

test('define la cajonera Koncisa Plus como GLB independiente con su código y dimensiones', () => {
  const drawer = createKoncisaPlusDrawerPart({ x: 1250, y: 0, z: -450 });

  assert.equal(drawer.type, 'GLB_PART');
  assert.equal(drawer.code, '22000135270');
  assert.equal(drawer.logicalCode, '2KAL003000');
  assert.equal(drawer.model.src, '/assets/models/koncisaPlus/2KAL003000.glb');
  assert.deepEqual(drawer.dimMm, { widthMm: 560, depthMm: 370, heightMm: 480 });
  assert.deepEqual(drawer.position, { x: 1250, y: 0, z: -450 });
  assert.equal(drawer.meta.category, 'koncisa-plus-accessories');
  assert.equal(KONCISA_PLUS_DRAWER.thumbnailSrc, '/assets/imagen/KoncisaPlusImagenes/2KAL003000.png');
});