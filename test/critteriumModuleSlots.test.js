import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { prepareCritterium8Sequence, prepareCritterium8SequenceRebuild } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { registerCritterium8Instance, unregisterCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { registerCritterium8Sequence, replaceCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import { serializeCritterium8Sequence, restoreCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequencePersistence.js';
import { createCritteriumSystemFromSequences, registerCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystem.js';
import { resolveCritteriumConnectionPoints } from '../src/mepal/critterium8/system/layout/CritteriumConnectionResolver.js';
import { previewCritteriumModuleSlotSnap } from '../src/mepal/critterium8/system/layout/CritteriumModuleSnap.js';
import { editCritteriumModuleSlots, captureCritteriumModuleOverrides, reconcileCritteriumModuleSlots } from '../src/mepal/critterium8/composition/sequenceModuleSlots.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';

async function makeSequence(scene, parts, pickables, prefix, count, startX = 0) {
  const frames = [];
  for (let index = 0; index < count; index += 1) {
    const instance = await createCritterium8Instance({ widthCm: 90, heightCm: 90,
      instanceId: `${prefix}_I${index}`, frameId: `${prefix}_F${index}` });
    instance.assembly.position.x = startX + 0.45 + 0.9 * index;
    registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
    frames.push(instance.assembly);
  }
  const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(prepared.success, true, prepared.reason);
  registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
  return { root: prepared.sequenceRoot, frames };
}

test('creación y operaciones de slots conservan identidad y compactan desde dimensiones comerciales', () => {
  const frames = [0, 1, 2].map((index) => ({ frameId: `F${index}`, instanceId: `I${index}`,
    position: { x: 0.45 + index * 0.9, z: 0 }, rotationY: 0, widthCm: 90, depthCm: 8 }));
  const initial = reconcileCritteriumModuleSlots({ id: 'S1' }, frames);
  assert.equal(initial.slots.length, 3);
  assert.equal(new Set(initial.slots.map((slot) => slot.slotId)).size, 3);
  assert.equal(initial.slotConnections.length, 2);
  const inserted = editCritteriumModuleSlots(initial, 'INSERT', { index: 1, frameId: 'F_NEW', moduleId: 'M_NEW', slotIdNew: 'S_NEW' });
  assert.deepEqual(inserted.slots.map((slot) => slot.frameId), ['F0', 'F_NEW', 'F1', 'F2']);
  inserted.slots.forEach((slot, index) => assert.ok(Math.abs(slot.position[0] - [0.45, 1.35, 2.25, 3.15][index]) < 1e-9));
  assert.equal(inserted.slots[2].slotId, initial.slots[1].slotId);
  const duplicated = editCritteriumModuleSlots(inserted, 'DUPLICATE', { slotId: initial.slots[1].slotId,
    frameId: 'F_COPY', moduleId: 'M_COPY', slotIdNew: 'S_COPY' });
  assert.equal(duplicated.slots[3].slotId, 'S_COPY');
  assert.notEqual(duplicated.slots[3].moduleId, duplicated.slots[2].moduleId);
  const reordered = editCritteriumModuleSlots(duplicated, 'REORDER', { slotId: 'S_COPY', index: 0 });
  assert.equal(reordered.slots[0].slotId, 'S_COPY');
  assert.equal(reordered.slots[0].position[0], 0.45);
  const reduced = editCritteriumModuleSlots(reordered, 'REMOVE', { slotId: 'S_NEW' });
  assert.equal(reduced.slots.length, 4);
  assert.equal(reduced.slotConnections.length, 3);
  assert.equal(reduced.slots.some((slot) => slot.slotId === 'S_NEW'), false);
  const configured = editCritteriumModuleSlots(reduced, 'CONFIGURE', { slotId: 'S_COPY', widthCm: 120 });
  assert.equal(configured.slots[0].widthCm, 120);
  assert.ok(Math.abs(configured.slots[1].position[0] - 1.65) < 1e-9);
  const organized = editCritteriumModuleSlots({ ...configured, slots: configured.slots.map((slot, index) =>
    index === 1 ? { ...slot, transformOverride: { position: [9, 0, 0], quaternion: [0, 0, 0, 1] } } : slot) }, 'ORGANIZE');
  assert.equal(organized.slots[1].transformOverride, null);
});

test('crecimiento y reducción físicos reconstruyen junctions y cambian BOM solo con el frame', async () => {
  const scene = new Scene(); const parts = []; const pickables = [];
  const a = await makeSequence(scene, parts, pickables, 'G', 3);
  const b = await makeSequence(scene, parts, pickables, 'H', 2, 5);
  const system = createCritteriumSystemFromSequences([a.root, b.root]);
  registerCritteriumSystem({ system, scene, partsRegistry: parts });
  const originalIds = a.root.userData.sequence.slots.map((slot) => slot.slotId);
  const bomSignature = () => JSON.stringify(resolveCritterium8BOM(parts).rows
    .map(({ code, qty, sourceId }) => ({ code, qty, sourceId }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId) || left.code.localeCompare(right.code)));
  const before = bomSignature();
  const added = editCritteriumModuleSlots(a.root.userData.sequence, 'ADD', {
    frameId: 'G_F3', moduleId: 'G_M3', slotIdNew: 'G_S3',
  });
  const instance = await createCritterium8Instance({ ...a.frames[2].userData.config,
    instanceId: 'G_I3', frameId: 'G_F3' });
  const frame = registerCritterium8Instance({ instance, parent: a.root, partsRegistry: parts, pickables }).assembly;
  [...a.frames, frame].forEach((item) => {
    const slot = added.slots.find((candidate) => candidate.frameId === item.userData.frameId);
    item.position.fromArray(slot.position);
  });
  a.root.userData.sequence = added;
  const prepared = prepareCritterium8SequenceRebuild(a.root);
  assert.equal(prepared.success, true, prepared.reason);
  replaceCritterium8Sequence({ previousRoot: a.root, nextRoot: prepared.sequenceRoot,
    parent: system, partsRegistry: parts, pickables });
  assert.equal(prepared.sequence.slots.length, 4);
  assert.deepEqual(prepared.sequence.slots.slice(0, 3).map((slot) => slot.slotId), originalIds);
  assert.notEqual(bomSignature(), before);
  const reduced = editCritteriumModuleSlots(prepared.sequence, 'REMOVE', { slotId: 'G_S3' });
  scene.attach(frame);
  prepared.sequenceRoot.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY')
    .forEach((item) => item.position.fromArray(reduced.slots.find((slot) => slot.frameId === item.userData.frameId).position));
  prepared.sequenceRoot.userData.sequence = reduced;
  const preparedReduced = prepareCritterium8SequenceRebuild(prepared.sequenceRoot);
  assert.equal(preparedReduced.success, true, preparedReduced.reason);
  replaceCritterium8Sequence({ previousRoot: prepared.sequenceRoot, nextRoot: preparedReduced.sequenceRoot,
    parent: system, partsRegistry: parts, pickables });
  unregisterCritterium8Instance({ assembly: frame, partsRegistry: parts, pickables, dispose: false });
  assert.deepEqual(preparedReduced.sequence.slots.map((slot) => slot.slotId), originalIds);
  assert.equal(bomSignature(), before);
  assert.equal(system.userData.sequenceIds.includes(preparedReduced.sequence.id), true);
});

test('reconstrucción, override, persistencia, snap y sistema conservan slots y BOM', async () => {
  const scene = new Scene(); const parts = []; const pickables = [];
  const a = await makeSequence(scene, parts, pickables, 'A', 3);
  const b = await makeSequence(scene, parts, pickables, 'B', 2, 4);
  const system = createCritteriumSystemFromSequences([a.root, b.root]);
  registerCritteriumSystem({ system, scene, partsRegistry: parts });
  const slots = a.root.userData.sequence.slots;
  assert.equal(slots.length, 3);
  assert.equal(resolveCritteriumConnectionPoints(a.root).every((point) => slots.some((slot) => slot.slotId === point.slotId)), true);
  a.frames[1].position.z += 0.03;
  const preview = previewCritteriumModuleSlotSnap(a.frames[1], a.root);
  assert.equal(preview.status, 'GREEN');
  assert.equal(preview.slotId, slots[1].slotId);
  a.frames[1].position.z -= 0.03;
  const bomBefore = resolveCritterium8BOM(parts);
  a.frames[1].position.z += 0.04;
  const captured = captureCritteriumModuleOverrides(a.root.userData.sequence, a.frames.map((frame) => ({
    frameId: frame.userData.frameId, position: frame.position.toArray(), quaternion: frame.quaternion.toArray(),
  })));
  assert.equal(captured.slots[1].transformOverride.position[2], 0.04);
  a.frames[1].position.z -= 0.04;
  const entity = JSON.parse(JSON.stringify(serializeCritterium8Sequence(a.root)));
  const rebuilt = prepareCritterium8Sequence({ frameAssemblies: a.frames,
    options: { sequenceId: a.root.userData.sequenceId }, previousSequence: captured });
  assert.equal(rebuilt.success, true, rebuilt.reason);
  assert.deepEqual(rebuilt.sequence.slots.map((slot) => slot.slotId), slots.map((slot) => slot.slotId));
  assert.deepEqual(resolveCritterium8BOM(parts), bomBefore);
  const restoredScene = new Scene(); const restoredParts = []; const restoredPickables = [];
  const restoredFrames = [];
  for (const frame of a.frames) {
    const instance = await createCritterium8Instance({ ...frame.userData.config,
      instanceId: frame.userData.instanceId, frameId: frame.userData.frameId,
      transform: { position: frame.getWorldPosition(frame.position.clone()).toArray() } });
    registerCritterium8Instance({ instance, parent: restoredScene, partsRegistry: restoredParts, pickables: restoredPickables });
    restoredFrames.push(instance.assembly);
  }
  const restored = restoreCritterium8Sequence(entity, { scene: restoredScene, partsRegistry: restoredParts,
    pickables: restoredPickables, findFrame: (id) => restoredFrames.find((frame) => frame.userData.frameId === id) });
  assert.deepEqual(restored.userData.sequence.slots.map((slot) => slot.slotId), slots.map((slot) => slot.slotId));
});
