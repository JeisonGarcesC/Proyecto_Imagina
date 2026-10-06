import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { defaultCritteriumSequenceDraft, validateCritteriumSequenceDraft, validateCritteriumSystemDraft } from '../src/mepal/critterium8/integration/critterium8Configurator.js';
import { createCritteriumSystemFromSequences } from '../src/mepal/critterium8/system/critteriumSystem.js';

async function build(draft, offsetZ = 0) {
  const plan = validateCritteriumSequenceDraft(draft);
  assert.equal(plan.success, true, plan.reason);
  const scene = new THREE.Scene();
  const instances = [];
  for (const placement of plan.placements) {
    const position = [...placement.position]; position[2] += offsetZ;
    const instance = await createCritterium8Instance({ ...placement.config, transform: { position, rotation: [0, placement.rotationY, 0] } });
    scene.add(instance.assembly);
    instances.push(instance);
  }
  const result = prepareCritterium8Sequence({ frameAssemblies: instances.map((item) => item.assembly) });
  assert.equal(result.success, true, result.reason);
  scene.add(result.sequenceRoot);
  return { scene, instances, result };
}

test('configurador crea la misma secuencia y piezas que la ruta de frames existentes', async () => {
  const draft = defaultCritteriumSequenceDraft();
  const configured = await build(draft);
  const oldRoute = await build(draft);
  const codes = (items) => items.flatMap((item) => item.parts.map((part) => part.code)).sort();
  assert.deepEqual(codes(configured.instances), codes(oldRoute.instances));
  assert.deepEqual(configured.result.sequence.junctions.map((item) => item.type), oldRoute.result.sequence.junctions.map((item) => item.type));
  assert.equal(new Set(configured.instances.map((item) => item.assembly.userData.frameId)).size, 2);
});

test('sistema de dos secuencias usa objetos existentes y mantiene IDs comerciales', async () => {
  const drafts = [defaultCritteriumSequenceDraft(), defaultCritteriumSequenceDraft()];
  assert.equal(validateCritteriumSystemDraft(drafts).success, true);
  const first = await build(drafts[0]); const second = await build(drafts[1], 2);
  const roots = [first.result.sequenceRoot, second.result.sequenceRoot];
  first.scene.add(roots[1]);
  const frames = [...first.instances, ...second.instances].map((item) => item.assembly);
  const ids = frames.map((item) => item.userData.frameId);
  const system = createCritteriumSystemFromSequences(roots);
  assert.deepEqual(system.children, roots);
  assert.deepEqual(frames.map((item) => item.userData.frameId), ids);
  assert.equal(new Set(ids).size, ids.length);
  assert.notEqual(roots[0].userData.sequenceId, roots[1].userData.sequenceId);
  assert.equal(new Set(roots.flatMap((root) => root.userData.junctionIds)).size,
    roots.flatMap((root) => root.userData.junctionIds).length);
  assert.deepEqual(first.instances.map((item) => item.assembly.userData.config),
    second.instances.map((item) => item.assembly.userData.config));
});

test('configuración inválida se rechaza antes de crear instancias', () => {
  const draft = defaultCritteriumSequenceDraft();
  assert.equal(validateCritteriumSequenceDraft({ ...draft, frames: [draft.frames[0]] }).success, false);
  assert.equal(validateCritteriumSequenceDraft({ ...draft, frames: [{ ...draft.frames[0], widthCm: 999 }, draft.frames[1]] }).success, false);
  assert.equal(validateCritteriumSequenceDraft({ ...draft, orientationDeg: 45 }).success, false);
  assert.equal(validateCritteriumSystemDraft([]).success, false);
});
