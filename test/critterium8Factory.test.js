import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { getCritterium8AssemblyRoot, getCritterium8EditablePart } from '../src/mepal/critterium8/utils/critterium8Selection.js';
import { registerCritterium8Instance, unregisterCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';

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
});
