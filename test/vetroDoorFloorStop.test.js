import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Group, Vector3 } from 'three';
import { createVetroDoorAssemblyFromConfig, createVetroAssemblyFromEntity, getVetroAssemblyRoot } from '../src/mepal/vetro/assembly/vetroAssembly.js';
import { applyVetroDoorState, getVetroDoorFloorStop, getVetroDoorFloorStopPoint, moveVetroDoorFloorStopToWorld } from '../src/mepal/vetro/assembly/vetroDoorArticulation.js';
import { getVetroAssemblyCommercialMembers } from '../src/mepal/vetro/bom/vetroAssemblyBOM.js';
import { serializeVetroAssembly } from '../src/core/persistence/entitySerializers.js';

const config = (variant) => ({ category: 'DOORS', productType: 'DOOR_LEAF', variant, nominalHeightCm: 204 });
const position = (object) => object.getWorldPosition(new Vector3()).toArray();

for (const variant of ['SINGLE', 'DOUBLE']) {
  test(`${variant} door has one native floor stop and one commercial SKU through reload`, async () => {
    const scene = new Group();
    const created = await createVetroDoorAssemblyFromConfig(config(variant), scene);
    assert.equal(created.success, true, created.reason);
    const root = created.object;
    const stop = getVetroDoorFloorStop(root);
    assert.ok(stop);
    assert.equal(stop.userData.code, '22013883');
    assert.equal(stop.userData.visualSource, 'NATIVE');
    assert.equal(getVetroAssemblyRoot(stop.children[0].children[0]), root);
    assert.equal(root.children.length, 3);
    assert.equal(getVetroAssemblyCommercialMembers(root).filter((item) => item.code === '22013883').length, 1);
    assert.ok(Math.abs(new Box3().setFromObject(stop).min.y) < 0.005);
    const closed = position(stop);
    for (const angleDeg of [45, 90, 0]) {
      assert.equal(applyVetroDoorState(root, { hand: 'LH', swing: 'FRONT', angleDeg }), true);
      assert.deepEqual(position(stop), closed);
      assert.deepEqual(getVetroDoorFloorStopPoint(root), [closed[0], closed[2]]);
    }
    assert.equal(applyVetroDoorState(root, { hand: 'RH', swing: 'FRONT', angleDeg: 45 }), true);
    if (variant === 'SINGLE') assert.notDeepEqual(position(stop), closed);
    assert.equal(applyVetroDoorState(root, { hand: 'RH', swing: 'BACK', angleDeg: 45 }), true);
    assert.ok(position(stop)[2] > closed[2]);
    const beforeMove = position(stop);
    root.position.x += 0.4;
    root.updateMatrixWorld(true);
    assert.ok(Math.abs(position(stop)[0] - beforeMove[0] - 0.4) < 1e-9);
    root.rotation.y = Math.PI / 2;
    root.updateMatrixWorld(true);
    assert.notDeepEqual(position(stop), beforeMove);
    const entity = serializeVetroAssembly(root);
    assert.equal(entity.members.length, 3);
    const loaded = await createVetroAssemblyFromEntity(entity);
    assert.equal(loaded.success, true, loaded.reason);
    assert.equal(loaded.object.children.length, 3);
    assert.equal(getVetroAssemblyCommercialMembers(loaded.object).filter((item) => item.code === '22013883').length, 1);
    scene.add(loaded.object);
    assert.ok(new Vector3(...position(getVetroDoorFloorStop(loaded.object))).distanceTo(new Vector3(...position(stop))) < 1e-9);
    scene.remove(root);
    assert.equal(stop.parent, root);
    scene.add(root);
    assert.equal(getVetroAssemblyRoot(stop), root);
  });
}

test('manual floor stop movement uses assembly coordinates and survives state changes and reload', async () => {
  const scene = new Group();
  const { object: root } = await createVetroDoorAssemblyFromConfig(config('SINGLE'), scene);
  const stop = getVetroDoorFloorStop(root);
  const automatic = getVetroDoorFloorStopPoint(root);
  assert.equal(stop.userData.floorStopPlacement.mode, 'AUTO');
  applyVetroDoorState(root, { hand: 'RH', swing: 'FRONT', angleDeg: 45 });
  assert.notDeepEqual(getVetroDoorFloorStopPoint(root), automatic);
  root.rotation.y = Math.PI / 3;
  root.position.set(0.7, 0, 0.3);
  root.updateMatrixWorld(true);
  const desired = [1.2, -0.4];
  assert.equal(moveVetroDoorFloorStopToWorld(root, ...desired), true);
  assert.equal(stop.userData.floorStopPlacement.mode, 'MANUAL');
  assert.ok(Math.hypot(...getVetroDoorFloorStopPoint(root).map((value, index) => value - desired[index])) < 1e-9);
  const savedLocal = stop.position.clone();
  applyVetroDoorState(root, { hand: 'LH', swing: 'BACK', angleDeg: 90 });
  assert.ok(stop.position.distanceTo(savedLocal) < 1e-9);
  assert.ok(Math.hypot(...getVetroDoorFloorStopPoint(root).map((value, index) => value - desired[index])) < 1e-9);
  const saved = serializeVetroAssembly(root);
  assert.equal(saved.members.find((member) => member.code === '22013883').floorStopPlacement.mode, 'MANUAL');
  const loaded = await createVetroAssemblyFromEntity(saved);
  assert.equal(loaded.success, true);
  scene.add(loaded.object);
  const loadedStop = getVetroDoorFloorStop(loaded.object);
  assert.equal(loadedStop.userData.floorStopPlacement.mode, 'MANUAL');
  assert.ok(loadedStop.position.distanceTo(savedLocal) < 1e-9);
  assert.ok(Math.hypot(...getVetroDoorFloorStopPoint(loaded.object).map((value, index) => value - desired[index])) < 1e-9);
  assert.equal(getVetroAssemblyCommercialMembers(loaded.object).filter((member) => member.code === '22013883').length, 1);
});
