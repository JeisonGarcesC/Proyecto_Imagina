import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { getCritterium8AssemblyRoot, getCritterium8EditablePart } from '../src/mepal/critterium8/utils/critterium8Selection.js';
import { registerCritterium8Instance, unregisterCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { rebuildCritterium8Instance } from '../src/mepal/critterium8/integration/rebuildCritterium8Instance.js';
import { patchCritterium8TileConfig, resolveCritterium8ConfigPatch } from '../src/mepal/critterium8/integration/critterium8Config.js';

test('factory creates 90, 204 and floor-to-ceiling frames with serializable metadata', async () => {
  for (const config of [
    { widthCm: 60, heightCm: 90 },
    { widthCm: 90, heightCm: 204 },
    { widthCm: 120, heightCm: 204, frameMode: 'FLOOR_TO_CEILING', projectHeightCm: 242 },
  ]) {
    const result = await createCritterium8Instance(config);
    assert.equal(result.assembly.userData.kind, 'CRITTERIUM_8_ASSEMBLY');
    assert.doesNotThrow(() => JSON.stringify(result.assembly.userData.config));
    assert.doesNotThrow(() => JSON.stringify(result.assembly.userData.definition));
    assert.equal(result.assembly.userData.footprint2D.type, 'RECTANGLE');
    assert.ok(result.parts.length > 0);
  }
});

test('factory instances and physical part identities are independent', async () => {
  const first = await createCritterium8Instance({ widthCm: 90, heightCm: 128 });
  const second = await createCritterium8Instance({ widthCm: 90, heightCm: 128 });
  assert.notEqual(first.assembly.userData.instanceId, second.assembly.userData.instanceId);
  assert.notEqual(first.assembly.userData.frameId, second.assembly.userData.frameId);
  const part = first.assembly.children[0];
  assert.equal(getCritterium8AssemblyRoot(part), first.assembly);
  assert.equal(getCritterium8EditablePart(part.children[0] || part), part);
  assert.equal(part.userData.excludeFromIndependentMove, true);
  first.assembly.position.x = 2;
  first.assembly.rotation.y = Math.PI / 2;
  assert.equal(second.assembly.position.x, 0);
  assert.equal(second.assembly.rotation.y, 0);
});

test('registration and transactional removal cover roots, pickables and disposal', async () => {
  const scene = new THREE.Scene();
  const parts = [];
  const pickables = [];
  const instance = await createCritterium8Instance({ widthCm: 90, heightCm: 128 });
  const registered = registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
  assert.equal(scene.children.includes(instance.assembly), true);
  assert.equal(parts.length, registered.physicalParts.length + 1);
  assert.equal(pickables.length, registered.physicalParts.length);
  assert.equal(unregisterCritterium8Instance({ assembly: instance.assembly, partsRegistry: parts, pickables }), true);
  assert.equal(parts.length, 0);
  assert.equal(pickables.length, 0);
  assert.equal(scene.children.includes(instance.assembly), false);
  const replacement = await createCritterium8Instance({ widthCm: 120, heightCm: 166 });
  const next = registerCritterium8Instance({ instance: replacement, parent: scene, partsRegistry: parts, pickables });
  assert.equal(parts.length, next.physicalParts.length + 1);
  assert.ok(pickables.every((object) => getCritterium8AssemblyRoot(object) === replacement.assembly));
});

test('config changes rebuild dimensions and preserve logical identity and transform', async () => {
  const original = await createCritterium8Instance({ widthCm: 60, heightCm: 90 });
  original.assembly.position.set(3, 0.25, -2);
  original.assembly.rotation.y = Math.PI / 3;
  original.assembly.scale.set(1.2, 1.2, 1.2);
  const rebuilt128 = await rebuildCritterium8Instance({ assembly: original.assembly, patch: { widthCm: 90, heightCm: 128, projectHeightCm: 128 } });
  assert.equal(rebuilt128.success, true);
  assert.equal(rebuilt128.instance.assembly.userData.instanceId, original.assembly.userData.instanceId);
  assert.equal(rebuilt128.instance.assembly.userData.assemblyId, original.assembly.userData.assemblyId);
  assert.deepEqual(rebuilt128.instance.assembly.position.toArray(), original.assembly.position.toArray());
  assert.deepEqual(rebuilt128.instance.assembly.quaternion.toArray(), original.assembly.quaternion.toArray());
  assert.deepEqual(rebuilt128.instance.assembly.scale.toArray(), original.assembly.scale.toArray());
  const rebuilt204 = await rebuildCritterium8Instance({ assembly: rebuilt128.instance.assembly, patch: { heightCm: 204, projectHeightCm: 204 } });
  assert.equal(rebuilt204.success, true);
  assert.equal(rebuilt204.instance.assembly.userData.config.heightCm, 204);
  assert.equal(rebuilt204.instance.assembly.userData.footprint2D.bounds.w, 0.9);
});

test('FULL_TILE validates documented heights and tile assignments', async () => {
  const instance = await createCritterium8Instance({ widthCm: 60, heightCm: 90 });
  const validMode = resolveCritterium8ConfigPatch({ config: instance.assembly.userData.config, patch: { compositionMode: 'FULL_TILE' }, frameId: instance.assembly.userData.frameId });
  assert.equal(validMode.success, true);
  assert.equal(validMode.composition.tileSlots[0].heightCm, 76);
  const invalidMode = resolveCritterium8ConfigPatch({ config: { ...instance.assembly.userData.config, heightCm: 110 }, patch: { compositionMode: 'FULL_TILE' }, frameId: instance.assembly.userData.frameId });
  assert.equal(invalidMode.success, false);
  assert.equal(invalidMode.reason, 'FULL_TILE_NOT_DOCUMENTED_FOR_FRAME');
  const assigned = patchCritterium8TileConfig({ config: validMode.config, frameId: instance.assembly.userData.frameId, slotId: validMode.composition.tileSlots[0].id, patch: { tileType: 'FORMICA' } });
  assert.equal(assigned.success, true);
  assert.equal(assigned.config.tiles[0].tileType, 'FORMICA');
  const withTile = await createCritterium8Instance({ ...assigned.config, instanceId: instance.assembly.userData.instanceId });
  const tilePart = withTile.assembly.children.find((child) => child.userData?.partType === 'TILE');
  assert.equal(getCritterium8EditablePart(tilePart?.children[0] || tilePart), tilePart);
  assert.equal(tilePart.userData.slotId, validMode.composition.tileSlots[0].id);
});

test('modular slots include 38 and 20 and discard incompatible tiles explicitly', async () => {
  const instance = await createCritterium8Instance({ widthCm: 60, heightCm: 110 });
  const composition = instance.assembly.userData.composition;
  assert.deepEqual(composition.tileSlots.map((slot) => slot.heightCm), [38, 38, 20]);
  const portSlot = composition.tileSlots[0];
  const assigned = patchCritterium8TileConfig({ config: instance.assembly.userData.config, frameId: instance.assembly.userData.frameId, slotId: portSlot.id, patch: { tileType: 'PORT' } });
  assert.equal(assigned.success, true);
  const narrowed = resolveCritterium8ConfigPatch({ config: assigned.config, patch: { widthCm: 30 }, frameId: instance.assembly.userData.frameId });
  assert.equal(narrowed.success, true);
  assert.equal(narrowed.config.tiles.length, 0);
  assert.ok(narrowed.diagnostics.some((item) => item.code === 'TILE_ASSIGNMENT_DISCARDED'));
});

test('failed transactional rebuild leaves the old assembly connected and untouched', async () => {
  const scene = new THREE.Scene();
  const original = await createCritterium8Instance({ widthCm: 90, heightCm: 128 });
  scene.add(original.assembly);
  const result = await rebuildCritterium8Instance({
    assembly: original.assembly,
    patch: { heightCm: 166 },
    createInstance: async () => { throw new Error('SIMULATED_RENDER_FAILURE'); },
  });
  assert.equal(result.success, false);
  assert.equal(result.reason, 'SIMULATED_RENDER_FAILURE');
  assert.equal(original.assembly.parent, scene);
  assert.ok(original.assembly.children.length > 0);
});
