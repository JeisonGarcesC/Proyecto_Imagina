import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Vector3 } from 'three';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { createVetroDoorAssembly, createVetroAssemblyFromEntity, detachVetroAssembly, restoreVetroAssembly, getVetroAssemblyRoot } from '../src/mepal/vetro/assembly/vetroAssembly.js';
import { serializeProjectEntities, serializeVetroAssembly } from '../src/core/persistence/entitySerializers.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

const worldPosition = (object) => object.getWorldPosition(new Vector3()).toArray();

async function product(productType, variant, x) {
  const config = productType === 'DOOR_FRAME'
    ? { category: 'DOORS', productType, variant, nominalHeightCm: 204, finish: 'ANODIZED' }
    : { category: 'DOORS', productType, variant, nominalHeightCm: 204 };
  const result = await createVetroInstance({ config });
  assert.equal(result.success, true);
  result.object.position.x = x;
  return result.object;
}

test('assembly root supports one move and one delete with undo and redo', async () => {
  const scene = new Group();
  const frame = await product('DOOR_FRAME', 'SINGLE_WITHOUT_DUCT', 0);
  const leaf = await product('DOOR_LEAF', 'SINGLE', 0.2);
  scene.add(frame, leaf);
  const root = createVetroDoorAssembly({ frame, leaf, parent: scene }).object;
  const originalLeaf = worldPosition(leaf);
  const history = createHistoryManager({ replayAction: (action, direction) => {
    if (action.type === HISTORY_ACTION_TYPES.MOVE) root.position.x = direction === 'undo' ? action.before : action.after;
    if (action.type === HISTORY_ACTION_TYPES.DELETE) {
      if (direction === 'undo') scene.add(root);
      else scene.remove(root);
    }
    root.updateMatrixWorld(true);
  } });
  root.position.x = 0.5;
  root.updateMatrixWorld(true);
  history.pushAction({ type: HISTORY_ACTION_TYPES.MOVE, before: 0, after: 0.5 });
  assert.ok(Math.abs(worldPosition(leaf)[0] - originalLeaf[0] - 0.5) < 1e-9);
  await history.undo();
  assert.deepEqual(worldPosition(leaf), originalLeaf);
  await history.redo();
  assert.ok(Math.abs(worldPosition(leaf)[0] - originalLeaf[0] - 0.5) < 1e-9);
  scene.remove(root);
  history.pushAction({ type: HISTORY_ACTION_TYPES.DELETE });
  assert.equal(root.parent, null);
  assert.equal(getVetroAssemblyRoot(frame), root);
  await history.undo();
  assert.equal(root.parent, scene);
  assert.equal(root.children.length, 2);
  await history.redo();
  assert.equal(root.parent, null);
});

for (const [frameVariant, leafVariant] of [['SINGLE_WITHOUT_DUCT', 'SINGLE'], ['DOUBLE_WITHOUT_DUCT', 'DOUBLE']]) {
  test(`${leafVariant} door groups existing products without changing their world transforms or SKUs`, async () => {
    const scene = new Group();
    const frame = await product('DOOR_FRAME', frameVariant, 1.2);
    const leaf = await product('DOOR_LEAF', leafVariant, 1.45);
    scene.add(frame, leaf);
    const positions = [worldPosition(frame), worldPosition(leaf)];
    const codes = [frame.userData.code, leaf.userData.code];
    const grouped = createVetroDoorAssembly({ frame, leaf, parent: scene });
    assert.equal(grouped.success, true, grouped.reason);
    const root = grouped.object;
    assert.equal(root.userData.kind, 'VETRO_ASSEMBLY');
    assert.equal(root.userData.relationships[0].type, 'MARCO_NAVE');
    assert.equal(getVetroAssemblyRoot(frame), root);
    assert.equal(getVetroAssemblyRoot(leaf.children[0]), root);
    assert.deepEqual([worldPosition(frame), worldPosition(leaf)], positions);
    assert.deepEqual(root.userData.members.map((member) => member.sku), codes);
    root.position.x += 0.5;
    assert.deepEqual(worldPosition(frame), [positions[0][0] + 0.5, 0, 0]);
    assert.deepEqual(worldPosition(leaf), [positions[1][0] + 0.5, 0, 0]);
    const beforeRotate = leaf.position.clone();
    root.rotation.y = Math.PI / 2;
    root.updateMatrixWorld(true);
    assert.ok(leaf.position.distanceTo(beforeRotate) < 1e-9);
    assert.ok(Math.abs(worldPosition(leaf)[2] + 0.25) < 1e-9);
    const entity = serializeVetroAssembly(root);
    const rebuilt = await createVetroAssemblyFromEntity(entity);
    assert.equal(rebuilt.success, true, rebuilt.reason);
    scene.add(rebuilt.object);
    assert.deepEqual(rebuilt.object.userData.members, root.userData.members);
    assert.deepEqual(rebuilt.object.userData.relationships, root.userData.relationships);
    assert.deepEqual(rebuilt.object.children.map((item) => item.userData.code), codes);
    assert.ok(new Vector3(...worldPosition(rebuilt.object.children[1])).distanceTo(new Vector3(...worldPosition(leaf))) < 1e-9);
    const { entities } = serializeProjectEntities([{ obj: root }, { obj: frame }, { obj: leaf }]);
    assert.equal(entities.filter((item) => item.kind === 'VETRO_ASSEMBLY').length, 1);
    assert.equal(entities.filter((item) => item.kind === 'VETRO_PRODUCT').length, 0);
    assert.equal(entities.find((item) => item.kind === 'VETRO_ASSEMBLY').members.length, 2);
    assert.equal(root.userData.code, undefined);
    assert.equal(root.userData.excludeFromBOM, true);
    const moved = worldPosition(leaf);
    assert.equal(detachVetroAssembly(root), true);
    assert.deepEqual(worldPosition(leaf), moved);
    assert.equal(getVetroAssemblyRoot(frame), null);
    assert.equal(frame.userData.parentAssemblyId, undefined);
    assert.equal(restoreVetroAssembly(root, [frame, leaf], scene), true);
    assert.deepEqual(worldPosition(leaf), moved);
    assert.equal(getVetroAssemblyRoot(frame), root);
  });
}
