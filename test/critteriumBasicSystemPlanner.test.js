import test from 'node:test';
import assert from 'node:assert/strict';
import { createCritteriumBasicPlan, findCritteriumBasicOptions, listCritteriumBasicWidths, measureCritteriumBasicPlan } from '../src/mepal/critterium8/integration/critteriumBasicSystemPlanner.js';
import { Group, Vector3 } from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { createCritteriumSystemFromSequences, getCritteriumSystemRoot, moveCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystem.js';
import { restoreCritteriumSystem, serializeCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystemPersistence.js';

const widthsOf = (option) => option.plan.sides[0].draft.frames.map((frame) => frame.widthCm);

test('basic width generation retains distinct compositions with the same nominal length', () => {
  const candidates = listCritteriumBasicWidths(2700);
  assert.equal(candidates.length, 917);
  const at2700 = candidates.filter((item) => item.nominalMm === 2700).map((item) => item.frameWidthsCm);
  assert.ok(at2700.some((widths) => JSON.stringify(widths) === '[90,90,90]'));
  assert.ok(at2700.some((widths) => JSON.stringify(widths) === '[120,120,30]'));
  assert.equal(new Set(candidates.map((item) => item.frameWidthsCm.join(','))).size, candidates.length);
});

for (const [target, widths, exterior] of [
  [1800, [90, 90], 1877],
  [2400, [120, 120], 2477],
  [2700, [90, 90, 90], 2777],
  [2700, [120, 120, 30], 2777],
  [3600, [90, 90, 90, 90], 3677],
]) test(`${widths.join(' + ')} survives generation and reaches Three.js measurement`, async () => {
  assert.ok(listCritteriumBasicWidths(target).some((item) => JSON.stringify(item.frameWidthsCm) === JSON.stringify(widths)));
  const plan = createCritteriumBasicPlan({ shape: 'LINE', lengthsMm: [target], heightCm: 90, frameWidthsBySide: [widths] });
  const measured = await measureCritteriumBasicPlan(plan);
  assert.equal(measured.success, true, measured.reason);
  assert.equal(measured.exteriorMm.width, exterior);
});

test('2700 mm options show both distinct 2777 mm compositions within the existing three-choice limit', async () => {
  const options = await findCritteriumBasicOptions({ shape: 'LINE', lengthsMm: [2700], heightCm: 90 });
  assert.equal(options.length, 3);
  for (const widths of [[90, 90, 90], [120, 120, 30]]) {
    const option = options.find((item) => JSON.stringify(widthsOf(item)) === JSON.stringify(widths));
    assert.ok(option, `${widths.join(' + ')} is missing`);
    assert.equal(option.exteriorMm.width, 2777);
    assert.equal(option.errorMm, 77);
  }
  assert.ok(options.every((item) => !item.exact));
  assert.ok(options.every((item, index) => index === 0 || options[index - 1].errorMm <= item.errorMm));
});

for (const [target, widths] of [[1800, [90, 90]], [3600, [90, 90, 90, 90]], [2400, [120, 120]]])
  test(`${target} mm options retain ${widths.join(' + ')}`, async () => {
    const options = await findCritteriumBasicOptions({ shape: 'LINE', lengthsMm: [target], heightCm: 90 });
    assert.ok(options.some((item) => JSON.stringify(widthsOf(item)) === JSON.stringify(widths)));
  });

for (const [shape, lengthsMm, arms, junctionType] of [
  ['T', [3600, 1800], [[90, 90], [90, 90], [90, 90]], 'T'],
  ['CROSS', [3600, 3600], [[90, 90], [90, 90], [90, 90], [90, 90]], 'X'],
]) test(`${shape} builds one system with a physical ${junctionType} junction`, async () => {
  const plan = createCritteriumBasicPlan({ shape, lengthsMm, heightCm: 90, frameWidthsBySide: arms });
  const measured = await measureCritteriumBasicPlan(plan);
  assert.equal(measured.success, true, measured.reason);
  assert.equal(measured.junctionType, junctionType);
  assert.ok(measured.exteriorMm.width > 0);
  assert.ok(measured.exteriorMm.depth > 0);
});

for (const shape of ['T', 'CROSS']) test(`${shape} options use exterior Box3 measurements and keep three choices`, async () => {
  const requested = shape === 'T' ? [3600, 1800] : [3600, 3600];
  const options = await findCritteriumBasicOptions({ shape, lengthsMm: requested, heightCm: 90 });
  assert.equal(options.length, 3);
  for (const option of options) {
    assert.equal(option.junctionType, shape === 'T' ? 'T' : 'X');
    assert.equal(option.errorMm,
      Math.abs(option.exteriorMm.width - requested[0]) + Math.abs(option.exteriorMm.depth - requested[1]));
    assert.equal(option.plan.sides.length, shape === 'T' ? 3 : 4);
  }
  assert.ok(options.every((option, index) => index === 0 || options[index - 1].errorMm <= option.errorMm));
});

test('Cruz no ofrece la altura 110 cm sin SKU X documentado', async () => {
  assert.deepEqual(await findCritteriumBasicOptions({ shape: 'CROSS', lengthsMm: [3600, 3600], heightCm: 110 }), []);
});

test('T and Cruz keep one selectable, movable and serializable system with their internal junction', async () => {
  for (const shape of ['T', 'CROSS']) {
    const arms = Array.from({ length: shape === 'T' ? 3 : 4 }, () => [90, 90]);
    const plan = createCritteriumBasicPlan({ shape, lengthsMm: shape === 'T' ? [3600, 1800] : [3600, 3600], heightCm: 90, frameWidthsBySide: arms });
    const scene = new Group();
    const frames = [];
    for (const [sideIndex, side] of plan.sides.entries()) {
      for (const [frameIndex, config] of side.draft.frames.entries()) {
        const id = `${shape}_${sideIndex}_${frameIndex}`;
        const instance = await createCritterium8Instance({ ...config, frameId: id, instanceId: id, transform: side.placements[frameIndex] });
        scene.add(instance.assembly);
        frames.push(instance.assembly);
      }
    }
    const prepared = prepareCritterium8Sequence({ frameAssemblies: frames, options: { sequenceId: `${shape}_SEQUENCE` } });
    assert.equal(prepared.success, true, prepared.reason);
    scene.add(prepared.sequenceRoot);
    const system = createCritteriumSystemFromSequences([prepared.sequenceRoot], { systemId: `${shape}_SYSTEM`, layout: { basicShape: shape } });
    assert.equal(system.userData.sequenceIds.length, 1);
    assert.equal(system.userData.connections.length, 0);
    assert.equal(prepared.sequence.junctions.filter((item) => item.type === (shape === 'T' ? 'T' : 'X')).length, 1);
    assert.equal(getCritteriumSystemRoot(frames[0]), system);
    const before = frames[0].getWorldPosition(new Vector3()).clone();
    moveCritteriumSystem(system, { x: 1, z: 2 });
    const after = frames[0].getWorldPosition(new Vector3());
    assert.ok(Math.abs(after.x - before.x - 1) < 1e-6);
    assert.ok(Math.abs(after.z - before.z - 2) < 1e-6);
    const entity = serializeCritteriumSystem(system);
    assert.equal(entity.layout.basicShape, shape);
    scene.attach(prepared.sequenceRoot);
    delete prepared.sequenceRoot.userData.parentSystemId;
    scene.remove(system);
    const restored = restoreCritteriumSystem(entity, { scene, partsRegistry: [], findSequence: (id) => id === prepared.sequenceRoot.userData.sequenceId ? prepared.sequenceRoot : null });
    assert.equal(restored.userData.sequenceIds[0], prepared.sequenceRoot.userData.sequenceId);
    assert.equal(restored.userData.layout.basicShape, shape);
    assert.equal(getCritteriumSystemRoot(frames.at(-1)), restored);
  }
});

test('basic Critterium line measures detached rendered geometry', async () => {
  const plan = createCritteriumBasicPlan({ shape: 'LINE', lengthsMm: [1800], frameWidthsBySide: [[90, 90]] });
  const result = await measureCritteriumBasicPlan(plan);
  assert.equal(result.success, true, result.reason);
  assert.ok(result.exteriorMm.width > 0);
  assert.equal(result.connectionCount, 0);
});

test('basic options distinguish requested exterior from actual exterior', async () => {
  const options = await findCritteriumBasicOptions({ shape: 'LINE', lengthsMm: [1800] });
  assert.ok(options.length > 0);
  assert.ok(options.every((item) => item.errorMm === Math.abs(item.exteriorMm.width - 1800)));
  assert.ok(options.every((item) => item.plan.sides[0].draft.frames.length >= 2));
});

for (const [shape, lengthsMm, frameWidthsBySide] of [
  ['L', [1800, 1800], [[90, 90], [90, 90]]],
  ['U', [1800, 1800, 1800], [[90, 90], [90, 90], [90, 90]]],
  ['RECTANGLE', [1800, 1800], [[90, 90], [90, 90], [90, 90], [90, 90]]],
]) test(`basic Critterium ${shape} validates corners`, async () => {
  const plan = createCritteriumBasicPlan({ shape, lengthsMm, frameWidthsBySide });
  const result = await measureCritteriumBasicPlan(plan);
  assert.equal(result.success, true, result.reason);
  assert.equal(result.connectionCount, shape === 'RECTANGLE' ? 4 : plan.sides.length - 1);
});

test('invalid corner is rejected before creation', async () => {
  const plan = createCritteriumBasicPlan({ shape: 'L', lengthsMm: [1800, 1800], frameWidthsBySide: [[90, 90], [90, 90]] });
  plan.sides[1].placements.forEach((placement) => { placement.position[0] += 0.2; });
  const result = await measureCritteriumBasicPlan(plan);
  assert.equal(result.success, false);
});

test('preview uses detached objects and has no persistence or history side effects', async () => {
  const plan = createCritteriumBasicPlan({ shape: 'RECTANGLE', lengthsMm: [1800, 1800], frameWidthsBySide: Array.from({ length: 4 }, () => [90, 90]) });
  const before = structuredClone(plan);
  const result = await measureCritteriumBasicPlan(plan);
  assert.equal(result.success, true, result.reason);
  assert.deepEqual(plan, before);
  assert.equal(result.closedLoop, true);
  assert.equal(result.connectionCount, 4);
});

for (const shape of ['LINE', 'L', 'U', 'RECTANGLE']) test(`${shape} reports exact and nonexact exterior dimensions`, async () => {
  const sideCount = shape === 'LINE' ? 1 : shape === 'L' ? 2 : shape === 'U' ? 3 : 4;
  const original = createCritteriumBasicPlan({ shape, lengthsMm: shape === 'LINE' ? [1800] : shape === 'U' ? [1800, 1800, 1800] : [1800, 1800], frameWidthsBySide: Array.from({ length: sideCount }, () => [90, 90]) });
  const measured = await measureCritteriumBasicPlan(original);
  assert.equal(measured.success, true, measured.reason);
  const exactLengths = shape === 'LINE' ? [measured.exteriorMm.width]
    : shape === 'RECTANGLE' ? [measured.exteriorMm.width, measured.exteriorMm.depth]
      : measured.sideExteriorMm;
  const exact = await findCritteriumBasicOptions({ shape, lengthsMm: exactLengths });
  assert.ok(exact.some((option) => option.exact), `${shape}: exact option missing`);
  const nonexact = await findCritteriumBasicOptions({ shape, lengthsMm: exactLengths.map((value) => value + 37) });
  assert.ok(nonexact.length > 0);
  assert.ok(nonexact.every((option) => !option.exact), `${shape}: unexpected exact option`);
});
