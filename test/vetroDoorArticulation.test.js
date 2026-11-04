import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Vector3 } from 'three';
import { createVetroDoorAssemblyFromConfig, createVetroAssemblyFromEntity, getVetroAssemblyRoot } from '../src/mepal/vetro/assembly/vetroAssembly.js';
import { applyVetroDoorState, getVetroDoorLeafSegments } from '../src/mepal/vetro/assembly/vetroDoorArticulation.js';
import { serializeVetroAssembly, serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

for (const variant of ['SINGLE', 'DOUBLE']) {
  test(`${variant} door is one root with three commercial SKUs, articulated 3D leaves and matching 2D segments`, async () => {
    const scene = new Group();
    const created = await createVetroDoorAssemblyFromConfig({ category: 'DOORS', productType: 'DOOR_LEAF', variant, nominalHeightCm: 204 }, scene);
    assert.equal(created.success, true, created.reason);
    const { object: root, frameInstance, leafInstance } = created;
    assert.equal(root.userData.kind, 'VETRO_ASSEMBLY');
    assert.equal(getVetroAssemblyRoot(leafInstance.object.children[0]), root);
    assert.equal(getVetroAssemblyRoot(frameInstance.object.children[0]), root);
    assert.equal(root.userData.excludeFromBOM, true);
    assert.equal(root.userData.code, undefined);
    assert.equal(root.userData.members.length, 3);
    const { entities } = serializeProjectEntities([{ obj: root }, { obj: frameInstance.object }, { obj: leafInstance.object }]);
    assert.equal(entities.length, 1);
    assert.deepEqual(entities[0].members.map((member) => member.code), root.userData.members.map((member) => member.sku));
    const framePosition = frameInstance.object.getWorldPosition(new Vector3()).toArray();
    const closed = getVetroDoorLeafSegments(root);
    assert.equal(closed.length, variant === 'DOUBLE' ? 2 : 1);
    for (const segment of closed) near(segment.start[1], segment.end[1]);
    for (const angleDeg of [45, 90, 0]) {
      assert.equal(applyVetroDoorState(root, { hand: 'LH', swing: 'FRONT', angleDeg }), true);
      const opened = getVetroDoorLeafSegments(root);
      opened.forEach((segment, index) => {
        near(distance(segment.start, closed[index].start), 0);
        near(distance(segment.start, segment.end), distance(closed[index].start, closed[index].end));
        if (angleDeg === 90) assert.ok(Math.abs(segment.end[1] - segment.start[1]) > 0.4);
      });
      assert.deepEqual(frameInstance.object.getWorldPosition(new Vector3()).toArray(), framePosition);
    }
    assert.equal(applyVetroDoorState(root, { hand: 'LH', swing: 'BACK', angleDeg: 90 }), true);
    const back = getVetroDoorLeafSegments(root);
    assert.equal(applyVetroDoorState(root, { hand: 'LH', swing: 'FRONT', angleDeg: 90 }), true);
    const front = getVetroDoorLeafSegments(root);
    near(back[0].end[1], -front[0].end[1]);
    if (variant === 'SINGLE') {
      assert.equal(applyVetroDoorState(root, { hand: 'RH', swing: 'FRONT', angleDeg: 90 }), true);
      const right = getVetroDoorLeafSegments(root)[0];
      assert.equal(right.side, 'RIGHT');
      assert.ok(right.start[0] > closed[0].start[0]);
    } else {
      assert.deepEqual(front.map((segment) => segment.side), ['LEFT', 'RIGHT']);
      assert.ok(front[0].end[1] * front[1].end[1] > 0);
    }
    root.position.set(0.5, 0, 0.25);
    root.rotation.y = 0.3;
    root.updateMatrixWorld(true);
    const savedSegments = getVetroDoorLeafSegments(root);
    const entity = serializeVetroAssembly(root);
    const rebuilt = await createVetroAssemblyFromEntity(entity);
    assert.equal(rebuilt.success, true, rebuilt.reason);
    scene.add(rebuilt.object);
    rebuilt.object.updateMatrixWorld(true);
    assert.deepEqual(rebuilt.object.userData.doorState, root.userData.doorState);
    rebuilt.object.userData.externalConnections = [{ connectionId: 'test' }];
    assert.deepEqual(serializeVetroAssembly(rebuilt.object).externalConnections, [{ connectionId: 'test' }]);
    getVetroDoorLeafSegments(rebuilt.object).forEach((segment, index) => {
      near(distance(segment.start, savedSegments[index].start), 0);
      near(distance(segment.end, savedSegments[index].end), 0);
    });
    const originalFrame = frameInstance.object.getWorldPosition(new Vector3()).clone();
    root.position.x += 0.4;
    root.updateMatrixWorld(true);
    near(frameInstance.object.getWorldPosition(new Vector3()).x - originalFrame.x, 0.4);
    scene.remove(root);
    assert.equal(root.parent, null);
    scene.add(root);
    assert.equal(root.children.length, 3);
  });
}

test('door state replays through global undo/redo', async () => {
  const scene = new Group();
  const { object: root } = await createVetroDoorAssemblyFromConfig({ category: 'DOORS', productType: 'DOOR_LEAF', variant: 'SINGLE', nominalHeightCm: 204 }, scene);
  const before = { ...root.userData.doorState };
  const after = { hand: 'RH', swing: 'BACK', angleDeg: 45 };
  applyVetroDoorState(root, after);
  const history = createHistoryManager({ replayAction: (action, direction) => {
    if (action.type === HISTORY_ACTION_TYPES.VETRO_DOOR_STATE) applyVetroDoorState(root, action[direction === 'undo' ? 'before' : 'after']);
  } });
  history.pushAction({ type: HISTORY_ACTION_TYPES.VETRO_DOOR_STATE, before, after });
  await history.undo();
  assert.deepEqual(root.userData.doorState, before);
  await history.redo();
  assert.deepEqual(root.userData.doorState, after);
});
