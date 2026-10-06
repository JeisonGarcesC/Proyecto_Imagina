import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';
import { previewMultipleStandardSnap, MAGNETIC_SNAP_DISTANCE_MM } from '../src/mepal/multiple/connections/multipleStandardSnap.js';

const product = (id, widthCm, x, patch = {}) => {
  const created = createMultipleInstance({ config: createMultipleConfigurationState({ widthCm, heightCm: patch.heightCm || 90, thicknessCm: patch.thicknessCm || 8 }), instanceId: id });
  assert.equal(created.success, true, created.reason);
  created.object.position.x = x;
  return created.object;
};

test('vista previa estándar usa extremos comerciales y atrae dentro de 150 mm sin persistir', () => {
  const a = product('a', 120, 0); const b = product('b', 120, 1.4);
  const scene = new Group(); scene.add(a, b);
  const preview = previewMultipleStandardSnap(b, [a, b]);
  assert.equal(preview.status, 'GREEN');
  assert.equal(preview.sourcePoint, 'LEFT');
  assert.equal(preview.targetPoint, 'RIGHT');
  assert.ok(Math.abs(preview.distanceMm - 200) < 1e-9);
  assert.equal(preview.finalPositionWorld[0], 1.2);
  assert.equal(b.position.x, 1.4);
  b.position.x = 1.3;
  const magnetic = previewMultipleStandardSnap(b, [a, b]);
  assert.equal(MAGNETIC_SNAP_DISTANCE_MM, 150);
  assert.ok(magnetic.magneticStrength > 0 && magnetic.magneticStrength < 1);
  assert.ok(magnetic.previewTransform.positionWorld[0] < 1.3);
  assert.equal(b.position.x, 1.3);
});

test('altura, espesor y orientación incompatibles impiden conexión estándar', () => {
  const a = product('a', 120, 0);
  const high = product('h', 120, 1.3, { heightCm: 110 });
  const thick = product('t', 120, 1.3); thick.userData.config = { ...thick.userData.config, thicknessCm: 10 };
  const rotated = product('r', 120, 0.6); rotated.rotation.y = Math.PI / 2; rotated.position.z = -0.6;
  assert.equal(previewMultipleStandardSnap(high, [a, high])?.reason, 'MULTIPLE_SNAP_HEIGHT_MISMATCH');
  assert.equal(previewMultipleStandardSnap(thick, [a, thick])?.reason, 'MULTIPLE_SNAP_THICKNESS_MISMATCH');
  assert.equal(previewMultipleStandardSnap(rotated, [a, rotated])?.reason, 'MULTIPLE_SNAP_ORIENTATION_MISMATCH');
});
