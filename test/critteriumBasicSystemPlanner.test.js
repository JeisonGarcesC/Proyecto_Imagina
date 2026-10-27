import test from 'node:test';
import assert from 'node:assert/strict';
import { createCritteriumBasicPlan, findCritteriumBasicOptions, measureCritteriumBasicPlan } from '../src/mepal/critterium8/integration/critteriumBasicSystemPlanner.js';

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
