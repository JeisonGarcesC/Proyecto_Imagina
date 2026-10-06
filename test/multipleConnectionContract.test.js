import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Vector3 } from 'three';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';
import { getMultipleProductConnectionPoints, getMultipleProductWorldConnectionPoints } from '../src/mepal/multiple/connections/multipleConnectionPoints.js';

const config = (widthCm) => createMultipleConfigurationState({ widthCm, heightCm: 90, thicknessCm: 8 });

test('producto comercial real expone puntos locales centrados y puntos mundiales dinámicos', () => {
  const created = createMultipleInstance({ config: config(120), instanceId: 'standard-a' });
  assert.equal(created.success, true);
  const product = created.object;
  const [left, right] = product.userData.connectionPoints;
  assert.deepEqual([left.positionLocal[0], right.positionLocal[0]], [-0.6, 0.6]);
  for (const point of [left, right]) {
    assert.equal(point.ownerId, 'standard-a');
    assert.equal(point.directionLocal.length, 3);
    assert.equal(point.normalLocal.length, 3);
    assert.equal(point.connectionRole, point.id);
  }
  const parent = new Group(); parent.position.set(4, 0, 2); parent.rotation.y = Math.PI / 2; parent.add(product);
  product.position.set(1, 0, 0);
  const world = getMultipleProductWorldConnectionPoints(product);
  assert.ok(Math.abs(new Vector3(...world[0].positionWorld).distanceTo(new Vector3(...world[1].positionWorld)) - 1.2) < 1e-12);
  assert.notDeepEqual(world[0].positionWorld, left.positionLocal);
  assert.deepEqual(product.userData.connectionPoints[0].positionLocal, [-0.6, 0, 0]);
});

test('geometría de 1200, 1500 y 1800 mm usa ancho comercial sin requerir el catálogo', () => {
  for (const widthCm of [120, 150, 180]) {
    const points = getMultipleProductConnectionPoints({ widthCm }, `w-${widthCm}`);
    assert.equal(points[0].positionLocal[0], -widthCm / 200);
    assert.equal(points[1].positionLocal[0], widthCm / 200);
  }
});

test('extremos comerciales coinciden para las cuatro combinaciones de ancho', () => {
  for (const [leftWidth, rightWidth] of [[120, 120], [120, 150], [150, 180], [180, 120]]) {
    const left = getMultipleProductConnectionPoints({ widthCm: leftWidth }, 'left')[1];
    const right = getMultipleProductConnectionPoints({ widthCm: rightWidth }, 'right')[0];
    const rightCenter = (leftWidth + rightWidth) / 200;
    assert.ok(Math.abs(left.positionLocal[0] - (rightCenter + right.positionLocal[0])) < 1e-12);
  }
});
